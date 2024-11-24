import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuery } from 'react-query'
import { CreateChore, GetChoresNew } from '../utils/Fetcher'

export const useChores = () => {
  return useQuery('chores', GetChoresNew)
}

export const useCreateChore = () => {
  const queryClient = useQueryClient()

  return useMutation(CreateChore, {
    onSuccess: () => {
      queryClient.invalidateQueries('chores')
    },
  })
}
