import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CreateFilter,
  DeleteFilter,
  GetFilterById,
  GetFilters,
  GetFiltersByUsage,
  GetPinnedFilters,
  ToggleFilterPin,
  UpdateFilter,
} from '../../utils/Fetcher'

// Query hook for fetching all filters
export const useFilters = () => {
  return useQuery({
    queryKey: ['filters'],
    queryFn: async () => {
      try {
        const response = await GetFilters()
        if (response.ok) {
          const data = await response.json()
          return data.res || data
        }
        throw new Error('Failed to fetch filters')
      } catch (error) {
        console.error('Error fetching filters:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

// Query hook for fetching pinned filters
export const usePinnedFilters = () => {
  return useQuery({
    queryKey: ['filters', 'pinned'],
    queryFn: async () => {
      try {
        const response = await GetPinnedFilters()
        if (response.ok) {
          const data = await response.json()
          return data.res || data
        }
        throw new Error('Failed to fetch pinned filters')
      } catch (error) {
        console.error('Error fetching pinned filters:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

// Query hook for fetching filters by usage
export const useFiltersByUsage = () => {
  return useQuery({
    queryKey: ['filters', 'by-usage'],
    queryFn: async () => {
      try {
        const response = await GetFiltersByUsage()
        if (response.ok) {
          const data = await response.json()
          return data.res || data
        }
        throw new Error('Failed to fetch filters by usage')
      } catch (error) {
        console.error('Error fetching filters by usage:', error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

// Hook to get a specific filter by ID
export const useFilter = filterId => {
  return useQuery({
    queryKey: ['filters', filterId],
    queryFn: async () => {
      try {
        const response = await GetFilterById(filterId)
        if (response.ok) {
          const data = await response.json()
          return data.res || data
        }
        throw new Error('Failed to fetch filter')
      } catch (error) {
        console.error('Error fetching filter:', error)
        return null
      }
    },
    enabled: !!filterId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })
}

// Mutation hook for creating a new filter
export const useCreateFilter = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async filterData => {
      try {
        const response = await CreateFilter(filterData)
        if (response.ok) {
          const data = await response.json()
          return data.res || data
        }
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create filter')
      } catch (error) {
        console.error('Error creating filter:', error)
        throw error
      }
    },
    onSuccess: newFilter => {
      // Update the filters cache
      queryClient.setQueryData(['filters'], oldFilters => {
        if (!oldFilters) return [newFilter]
        return [...oldFilters, newFilter]
      })

      // Invalidate and refetch
      queryClient.invalidateQueries(['filters'])
    },
    onError: error => {
      console.error('Create filter mutation failed:', error)
    },
  })
}

// Mutation hook for updating an existing filter
export const useUpdateFilter = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ filterId, filterData }) => {
      try {
        const response = await UpdateFilter(filterId, filterData)
        if (response.ok) {
          const data = await response.json()
          return data.res || data
        }
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update filter')
      } catch (error) {
        console.error('Error updating filter:', error)
        throw error
      }
    },
    onSuccess: updatedFilter => {
      // Update the filters cache
      queryClient.setQueryData(['filters'], oldFilters => {
        if (!oldFilters) return [updatedFilter]
        return oldFilters.map(filter =>
          filter.id === updatedFilter.id ? updatedFilter : filter,
        )
      })

      // Update specific filter cache
      queryClient.setQueryData(['filters', updatedFilter.id], updatedFilter)

      // Invalidate and refetch
      queryClient.invalidateQueries(['filters'])
    },
    onError: error => {
      console.error('Update filter mutation failed:', error)
    },
  })
}

// Mutation hook for deleting a filter
export const useDeleteFilter = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async filterId => {
      try {
        const response = await DeleteFilter(filterId)
        if (response.ok) {
          return { id: filterId, deleted: true }
        }
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete filter')
      } catch (error) {
        console.error('Error deleting filter:', error)
        throw error
      }
    },
    onSuccess: ({ id: deletedFilterId }) => {
      // Remove the filter from cache
      queryClient.setQueryData(['filters'], oldFilters => {
        if (!oldFilters) return []
        return oldFilters.filter(filter => filter.id !== deletedFilterId)
      })

      // Invalidate and refetch
      queryClient.invalidateQueries(['filters'])
    },
    onError: error => {
      console.error('Delete filter mutation failed:', error)
    },
  })
}

// Mutation hook for toggling filter pin status
export const useToggleFilterPin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async filterId => {
      try {
        const response = await ToggleFilterPin(filterId)
        if (response.ok) {
          const data = await response.json()
          return data.res || data
        }
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to toggle filter pin')
      } catch (error) {
        console.error('Error toggling filter pin:', error)
        throw error
      }
    },
    onSuccess: updatedFilter => {
      // Update the filters cache
      queryClient.setQueryData(['filters'], oldFilters => {
        if (!oldFilters) return [updatedFilter]
        return oldFilters.map(filter =>
          filter.id === updatedFilter.id ? updatedFilter : filter,
        )
      })

      // Update specific filter cache
      queryClient.setQueryData(['filters', updatedFilter.id], updatedFilter)

      // Invalidate related queries
      queryClient.invalidateQueries(['filters'])
      queryClient.invalidateQueries(['filters', 'pinned'])
    },
    onError: error => {
      console.error('Toggle filter pin mutation failed:', error)
    },
  })
}
