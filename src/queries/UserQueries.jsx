import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { GetAllCircleMembers, GetAllUsers } from '../utils/Fetcher'

export const useAllUsers = () => {
  return useQuery({
    queryKey: ['allUsers'],
    queryFn: GetAllUsers,
  })
}

export const useCircleMembers = () => {
  const [refetchKey, setRefetchKey] = useState(0)

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['allCircleMembers', refetchKey],
    queryFn: GetAllCircleMembers,
  })
  const handleRefetch = () => {
    setRefetchKey(prevKey => prevKey + 1)
    refetch()
  }

  return { data, error, isLoading, handleRefetch }
}
