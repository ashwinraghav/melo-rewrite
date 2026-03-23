/**
 * API client tests.
 *
 * Tests the fetch wrapper — correct headers, error handling, and response
 * deserialisation — without making real network requests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApiClient, ApiClientError } from '@/lib/api-client'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('ApiClient', () => {
  const getToken = vi.fn().mockResolvedValue('test-token')
  const client = createApiClient(getToken)

  beforeEach(() => {
    mockFetch.mockReset()
    getToken.mockResolvedValue('test-token')
  })

  it('attaches Bearer token to requests', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }))
    await client.getList('/v1/stories')
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.headers['Authorization']).toBe('Bearer test-token')
  })

  it('omits Authorization header when no token is available', async () => {
    getToken.mockResolvedValue(null)
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }))
    await client.getList('/v1/stories')
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.headers['Authorization']).toBeUndefined()
  })

  it('returns the deserialized response body', async () => {
    const payload = { data: [{ id: '1', title: 'Test' }], total: 1, hasMore: false }
    mockFetch.mockResolvedValue(jsonResponse(payload))
    const result = await client.getList('/v1/stories')
    expect(result).toEqual(payload)
  })

  it('throws ApiClientError on 401', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Not auth' } }, 401),
    )
    await expect(client.getList('/v1/stories')).rejects.toThrow(ApiClientError)
  })

  it('throws ApiClientError with correct code on 404', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404),
    )
    try {
      await client.get('/v1/stories/bad-id')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiClientError)
      expect((e as ApiClientError).code).toBe('NOT_FOUND')
      expect((e as ApiClientError).status).toBe(404)
    }
  })

  it('sends JSON body on POST requests', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: {} }, 201))
    await client.post('/v1/me/favorites/story-1')
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.method).toBe('POST')
  })

  it('sends PATCH with body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { childAge: 5 } }))
    await client.patch('/v1/me', { childAge: 5 })
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body)).toEqual({ childAge: 5 })
  })

  it('returns undefined for 204 No Content', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: async () => null })
    const result = await client.delete('/v1/me/favorites/story-1')
    expect(result).toBeUndefined()
  })
})
