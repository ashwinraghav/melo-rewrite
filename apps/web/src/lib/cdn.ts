/**
 * CDN catalog fetcher — reads static JSON from Cloud CDN.
 *
 * Story catalog data (lists + details) is pre-generated as static JSON
 * and served from cdn.melostories.com. No auth needed, no API server hit.
 */

import type { ApiResponse, PaginatedResponse } from '@mello/types'

const CDN_URL = 'https://cdn.melostories.com'

export async function fetchStoryList<T>(topic?: string): Promise<PaginatedResponse<T>> {
  const path = topic
    ? `${CDN_URL}/catalog/topics/${encodeURIComponent(topic)}.json`
    : `${CDN_URL}/catalog/stories.json`
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`)
  return res.json()
}

export async function fetchStoryDetail<T>(storyId: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${CDN_URL}/catalog/stories/${encodeURIComponent(storyId)}.json`)
  if (!res.ok) throw new Error(`Story fetch failed: ${res.status}`)
  return res.json()
}
