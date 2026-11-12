import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { TEMPLATE_ENTRY_POINT } from '../../data/taskTemplates'
import TemplateLibraryModal from '../components/TemplateLibraryModal'

const ENTRY_POINTS = Object.values(TEMPLATE_ENTRY_POINT)

/**
 * The library's addressable home.
 *
 * It renders the same modal the in-app surfaces open rather than a separate
 * page layout, so there is one implementation of the flow to maintain. The
 * route exists for what a route gives that modal state cannot: a link that
 * survives a refresh, can be sent in a support reply or release note, and can
 * carry a pre-filtered view.
 *
 * Query parameters:
 *   q        seeds the search box
 *   category seeds the category filter (ignored unless it names a real one)
 *   from     which surface linked here, for entry-point attribution
 */
const TemplatesView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const from = searchParams.get('from')
  const entryPoint = ENTRY_POINTS.includes(from)
    ? from
    : TEMPLATE_ENTRY_POINT.DIRECT_LINK

  // Closing should return where you came from, but a cold open — a shared
  // link, a refresh — has nothing behind it, and `navigate(-1)` would leave
  // the app. React Router marks that first entry with the key 'default'.
  const close = () => {
    if (location.key === 'default') navigate('/chores', { replace: true })
    else navigate(-1)
  }

  return (
    <TemplateLibraryModal
      onClose={close}
      entryPoint={entryPoint}
      initialQuery={searchParams.get('q') ?? ''}
      initialCategory={searchParams.get('category') ?? 'all'}
    />
  )
}

export default TemplatesView
