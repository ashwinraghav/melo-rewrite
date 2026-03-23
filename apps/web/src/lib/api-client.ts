/**
 * Typed API client.
 *
 * A thin wrapper around `fetch` that:
 *   - Attaches the Firebase ID token as a Bearer header
 *   - Deserialises the JSON response envelope
 *   - Throws a typed ApiClientError on non-2xx responses
 *
 * WHY NOT a library like axios or ky?
 * The native fetch API is sufficient for our use case and avoids adding a
 * dependency that could diverge from browser standards. If we need request
 * interceptors or retry logic in the future, swap this for ky.
 *
 * USAGE:
 *   const client = createApiClient(getIdToken)
 *   const { data } = await client.get<PaginatedResponse<StoryWithAudioUrl>>('/v1/stories')
 */

import type { ApiError, ApiResponse, PaginatedResponse } from '@mello/types'

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export type GetTokenFn = () => Promise<string | null>

export function createApiClient(getToken: GetTokenFn) {
  const baseUrl =
    typeof window !== 'undefined'
      ? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080'
      : process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080'

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (res.status === 204) return undefined as T

    const json = await res.json()

    if (!res.ok) {
      const err = json as ApiError
      throw new ApiClientError(
        err.error.code,
        err.error.message,
        res.status,
      )
    }

    return json as T
  }

  return {
    get: <T>(path: string) => request<ApiResponse<T>>('GET', path),
    getList: <T>(path: string) => request<PaginatedResponse<T>>('GET', path),
    post: <T>(path: string, body?: unknown) => request<ApiResponse<T>>('POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<ApiResponse<T>>('PATCH', path, body),
    delete: (path: string) => request<void>('DELETE', path),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
