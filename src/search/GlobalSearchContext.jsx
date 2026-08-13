import useMediaQuery from '@mui/material/useMediaQuery'
import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { offlineDB } from '../utils/OfflineDB'
import { isParentUser } from '../utils/UserHelpers'
import GlobalSearchPalette from './GlobalSearchPalette'
import { getSearchProviders } from './searchProviders'

const GlobalSearchContext = createContext(null)
const BLOCKED_ROUTES = [
  '/login',
  '/signup',
  '/welcome',
  '/onboarding',
  '/get-started',
  '/ready',
]

const unwrap = value => (Array.isArray(value) ? value : value?.res || [])
const uniqueBy = (items, getId) => [
  ...new Map(
    items.filter(Boolean).map(item => [String(getId(item)), item]),
  ).values(),
]

export const GlobalSearchProvider = ({ children }) => {
  const queryClient = useQueryClient()
  const { t } = useTranslation('settings')
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width:768px)')
  const [isOpen, setIsOpen] = useState(false)
  const [initialQuery, setInitialQuery] = useState('')
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      const cachedChores = queryClient
        .getQueriesData({ queryKey: ['chores'] })
        .flatMap(([, data]) => unwrap(data))
      const cachedHistory = [
        ...queryClient.getQueriesData({ queryKey: ['choresHistory'] }),
        ...queryClient.getQueriesData({ queryKey: ['choreHistory'] }),
      ].flatMap(([, data]) => unwrap(data))

      const [
        offlineChores,
        offlineHistory,
        offlineProjects,
        offlineLabels,
        offlineMembers,
        offlineProfile,
      ] = await Promise.all([
        offlineDB.getChores(true).catch(() => []),
        offlineDB.getHistoryByDays(365).catch(() => []),
        offlineDB.getKV('projects').catch(() => []),
        offlineDB.getKV('labels').catch(() => []),
        offlineDB.getKV('circle_members').catch(() => []),
        offlineDB.getKV('user_profile').catch(() => null),
      ])

      const projects = uniqueBy(
        [
          ...unwrap(queryClient.getQueryData(['projects'])),
          ...unwrap(offlineProjects),
        ],
        item => item.id,
      )
      const labels = uniqueBy(
        [
          ...unwrap(queryClient.getQueryData(['labels'])),
          ...unwrap(offlineLabels),
        ],
        item => item.id,
      )
      const members = uniqueBy(
        [
          ...unwrap(queryClient.getQueryData(['allCircleMembers'])),
          ...unwrap(offlineMembers),
        ],
        item => item.userId,
      )
      const chores = uniqueBy(
        [...cachedChores, ...unwrap(offlineChores)],
        item => item.id,
      )
      const history = uniqueBy(
        [...cachedHistory, ...unwrap(offlineHistory)],
        item => item.id,
      )
      const profile =
        queryClient
          .getQueriesData({ queryKey: ['userProfile'] })
          .find(([, data]) => data)?.[1] || offlineProfile

      const sources = {
        chores,
        history,
        projects,
        labels,
        members,
        isParent: isParentUser(profile),
        t,
        choresById: new Map(chores.map(item => [String(item.id), item])),
        projectsById: new Map(projects.map(item => [String(item.id), item])),
        membersById: new Map(members.map(item => [String(item.userId), item])),
      }

      const nextDocuments = getSearchProviders().flatMap(provider => {
        try {
          return provider.getDocuments(sources) || []
        } catch (error) {
          console.warn(`Search provider ${provider.id} failed`, error)
          return []
        }
      })
      setDocuments(nextDocuments)
    } finally {
      setIsLoading(false)
    }
  }, [queryClient, t])

  const openSearch = useCallback(
    (query = '') => {
      if (BLOCKED_ROUTES.some(route => location.pathname.startsWith(route)))
        return
      if (isMobile) {
        loadDocuments()
        navigate('/search', { state: { initialQuery: query } })
        return
      }
      setInitialQuery(query)
      setIsOpen(true)
      loadDocuments()
    },
    [isMobile, loadDocuments, location.pathname, navigate],
  )

  const closeSearch = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    const onKeyDown = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        isOpen ? closeSearch() : openSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeSearch, isOpen, openSearch])

  const value = useMemo(
    () => ({
      closeSearch,
      documents,
      isLoading,
      loadDocuments,
      openSearch,
    }),
    [closeSearch, documents, isLoading, loadDocuments, openSearch],
  )

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      {isOpen && (
        <GlobalSearchPalette
          documents={documents}
          initialQuery={initialQuery}
          isLoading={isLoading}
          onClose={closeSearch}
        />
      )}
    </GlobalSearchContext.Provider>
  )
}

export const useGlobalSearch = () => {
  const context = useContext(GlobalSearchContext)
  if (!context)
    throw new Error('useGlobalSearch must be used inside GlobalSearchProvider')
  return context
}
