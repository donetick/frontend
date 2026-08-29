import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useGlobalSearch } from './GlobalSearchContext'
import GlobalSearchPalette from './GlobalSearchPalette'

const GlobalSearchPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { documents, isLoading, loadDocuments } = useGlobalSearch()

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleClose = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/chores', { replace: true })
  }

  return (
    <GlobalSearchPalette
      documents={documents}
      initialQuery={location.state?.initialQuery || ''}
      isLoading={isLoading}
      onClose={handleClose}
      presentation='page'
    />
  )
}

export default GlobalSearchPage
