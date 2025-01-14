import { useState } from 'react'
import { useQuery } from 'react-query'
import { GetAllCircleMembers, GetAllUsers } from '../utils/Fetcher'

export const useAllUsers = () => {
  return useQuery('allUsers', GetAllUsers)
}

export const useCircleMembers = () => {
  const [refetchKey, setRefetchKey] = useState(0)

  const { data, error, isLoading, refetch } = useQuery(
    ['allCircleMembers', refetchKey],
    GetAllCircleMembers,
  )
  const handleRefetch = () => {
    setRefetchKey(prevKey => prevKey + 1)
    refetch()
  }

  return { data, error, isLoading, handleRefetch }
}
