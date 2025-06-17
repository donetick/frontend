import { useContext } from 'react'
import { SSEContext } from '../contexts/SSEContext'

export const useSSEContext = () => {
  console.log('=== useSSEContext called ===')
  return useContext(SSEContext)
}
