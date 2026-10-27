import { Navigate } from 'react-router-dom'

import StartupScreen from '../../components/StartupScreen'
import { getDefaultViewPath } from '../../utils/DefaultViewConfig'

/**
 * "/" is not a screen of its own — it forwards to whichever screen the user
 * picked as their default (Home or the task list). Both keep their own URL, so
 * a link to either one always lands where it says it does.
 */
const DefaultViewRoute = () => (
  <>
    {/* Holds the startup screen through the redirect's empty frame. */}
    <StartupScreen />
    <Navigate to={getDefaultViewPath()} replace />
  </>
)

export default DefaultViewRoute
