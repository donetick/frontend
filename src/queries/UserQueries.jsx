import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GetAllCircleMembers, GetAllUsers } from '../utils/Fetcher'

export const useAllUsers = () => {
  return useQuery({
    queryKey: ['allUsers'],
    queryFn: GetAllUsers,
  })
}

export const useCircleMembers = () => {
  const queryClient = useQueryClient()

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['allCircleMembers'],
    queryFn: GetAllCircleMembers,
  })

  const handleRefetch = () => {
    queryClient.invalidateQueries(['allCircleMembers'])
  }

  return { data, error, isLoading, handleRefetch }
}
