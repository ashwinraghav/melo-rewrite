'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useApiClient } from '@/hooks/useApiClient'
import { trackFavoriteAdd, trackFavoriteRemove } from '@/lib/analytics'
import type { Favorite, PaginatedResponse } from '@mello/types'

export function useFavorites() {
  const client = useApiClient()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => client.getList<Favorite>('/v1/me/favorites'),
    staleTime: 30_000,
  })

  const favorites = (data as PaginatedResponse<Favorite> | undefined)?.data ?? []

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.storyId)),
    [favorites],
  )

  const isFavorited = useCallback(
    (storyId: string) => favoriteIds.has(storyId),
    [favoriteIds],
  )

  const { mutate: addFavorite } = useMutation({
    mutationFn: (storyId: string) => client.post(`/v1/me/favorites/${storyId}`, {}),
    onMutate: async (storyId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] })
      const previous = queryClient.getQueryData<PaginatedResponse<Favorite>>(['favorites'])
      queryClient.setQueryData<PaginatedResponse<Favorite>>(['favorites'], (old) => {
        if (!old) return { data: [{ storyId, addedAt: new Date().toISOString() }], total: 1, hasMore: false }
        return {
          ...old,
          data: [...old.data, { storyId, addedAt: new Date().toISOString() }],
          total: old.total + 1,
        }
      })
      return { previous }
    },
    onError: (_err, _storyId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  const { mutate: removeFavoriteMutation } = useMutation({
    mutationFn: (storyId: string) => client.delete(`/v1/me/favorites/${storyId}`),
    onMutate: async (storyId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] })
      const previous = queryClient.getQueryData<PaginatedResponse<Favorite>>(['favorites'])
      queryClient.setQueryData<PaginatedResponse<Favorite>>(['favorites'], (old) => {
        if (!old) return { data: [], total: 0, hasMore: false }
        return {
          ...old,
          data: old.data.filter((f) => f.storyId !== storyId),
          total: Math.max(0, old.total - 1),
        }
      })
      return { previous }
    },
    onError: (_err, _storyId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  const toggleFavorite = useCallback(
    (storyId: string) => {
      if (favoriteIds.has(storyId)) {
        trackFavoriteRemove(storyId)
        removeFavoriteMutation(storyId)
      } else {
        trackFavoriteAdd(storyId)
        addFavorite(storyId)
      }
    },
    [favoriteIds, addFavorite, removeFavoriteMutation],
  )

  return { favoriteIds, isFavorited, toggleFavorite, isLoading }
}
