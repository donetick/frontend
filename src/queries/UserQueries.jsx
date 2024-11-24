import { useQuery } from 'react-query'
import { GetAllUsers } from '../utils/Fetcher'

export const useAllUsers = () => {
  return useQuery('allUsers', GetAllUsers)
}
