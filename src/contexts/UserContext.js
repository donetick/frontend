import { createContext } from 'react'

const UserContext = createContext({
  userProfile: null,
  setUserProfile: () => {},
})

export { UserContext }
