import { BASE_PATH } from './utils/BasePath'

const resolveApiUrl = () => {
  const configured = import.meta.env.VITE_APP_API_URL

  // No idea when this is used.
  // TODO: figure out if this is still needed and remove it if not.
  if (configured === 'AUTO') return `${window.location.hostname}/api`

  // Use a dedicated API URL if defined (e.g. for development testing)
  if (configured) return configured

  // Unset or empty (the self-hosted build): the API is same-origin.
  // Prefix with the runtime base path so calls also work under a sub-path such as Home Assistant ingress.
  return BASE_PATH
}

export const API_URL = resolveApiUrl()
export const REDIRECT_URL = import.meta.env.VITE_APP_REDIRECT_URL //|| 'http://localhost:3000'
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_APP_GOOGLE_CLIENT_ID
export const ENVIROMENT = import.meta.env.VITE_APP_ENVIROMENT
