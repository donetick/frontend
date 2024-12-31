import { useQuery } from 'react-query'
import { GetAllCircleMembers, GetAllUsers } from '../utils/Fetcher'

export const useAllUsers = () => {
  return useQuery('allUsers', GetAllUsers)
}

export const useCircleMembers = () => {
  return useQuery('allCircleMembers', GetAllCircleMembers)
}
