import {
  AddRounded,
  CheckCircleOutline,
  FolderOutlined,
  HistoryRounded,
  InboxOutlined,
  LabelOutlined,
  PersonOutline,
  SearchRounded,
  SettingsOutlined,
} from '@mui/icons-material'
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Input,
  List,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Typography,
} from '@mui/joy'
import Fuse from 'fuse.js'
import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import AppModal from '../components/common/AppModal'

const RECENTS_KEY = 'donetick.globalSearch.recents'
const GROUPS = [
  'tasks',
  'history',
  'projects',
  'labels',
  'people',
  'settings',
  'actions',
]

const ICONS = {
  tasks: <CheckCircleOutline />,
  history: <HistoryRounded />,
  projects: <FolderOutlined />,
  labels: <LabelOutlined />,
  people: <PersonOutline />,
  settings: <SettingsOutlined />,
  actions: <AddRounded />,
}

const buildQuickActions = t => [
  {
    id: 'action:create',
    provider: 'actions',
    title: t('search.actions.createTask'),
    subtitle: t('search.actions.quickAction'),
    route: '/chores/create',
  },
  {
    id: 'action:tasks',
    provider: 'actions',
    title: t('search.actions.viewAllTasks'),
    subtitle: t('search.actions.navigation'),
    route: '/chores',
  },
  {
    id: 'action:archived',
    provider: 'actions',
    title: t('search.actions.viewArchivedTasks'),
    subtitle: t('search.actions.navigation'),
    route: '/archived',
  },
  {
    id: 'action:settings',
    provider: 'actions',
    title: t('search.actions.openSettings'),
    subtitle: t('search.actions.navigation'),
    route: '/settings',
  },
]

const readRecents = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY)) || []
  } catch {
    return []
  }
}

const saveRecent = result => {
  if (result.provider === 'actions') return
  const recent = {
    id: result.id,
    provider: result.provider,
    route: result.route,
    title: result.title,
    subtitle: result.subtitle,
  }
  localStorage.setItem(
    RECENTS_KEY,
    JSON.stringify(
      [recent, ...readRecents().filter(item => item.id !== result.id)].slice(
        0,
        6,
      ),
    ),
  )
}

const Highlight = ({ query, text }) => {
  if (!text || !query.trim()) return text || null
  const words = query.trim().split(/\s+/).filter(Boolean)
  const escaped = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!escaped.length) return text
  const pattern = new RegExp(`(${escaped.join('|')})`, 'ig')
  const isMatch = new RegExp(`^(${escaped.join('|')})$`, 'i')
  return String(text)
    .split(pattern)
    .map((part, index) =>
      isMatch.test(part) ? (
        <Box
          component='mark'
          key={index}
          sx={{ bgcolor: 'warning.softBg', color: 'inherit', borderRadius: 2 }}
        >
          {part}
        </Box>
      ) : (
        part
      ),
    )
}

const SearchContainer = ({ children, onClose, presentation }) => {
  const { t } = useTranslation()

  if (presentation === 'page') {
    return (
      <Box
        component='main'
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100dvh - 56px)',
          minHeight: 0,
          overflow: 'hidden',
          bgcolor: 'background.body',
        }}
      >
        {children}
      </Box>
    )
  }

  return (
    <AppModal
      open
      onClose={onClose}
      disableRestoreFocus
      title={t('search.title')}
      size='lg'
      maxHeight='min(720px, calc(100dvh - 48px))'
      contentSx={{
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      sx={{ height: 'min(720px, calc(100dvh - 48px))' }}
    >
      {children}
    </AppModal>
  )
}

const GlobalSearchPalette = ({
  documents,
  initialQuery,
  isLoading,
  onClose,
  presentation = 'modal',
}) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const focusInputRef = useCallback(node => {
    if (node) requestAnimationFrame(() => node.focus())
  }, [])
  const [query, setQuery] = useState(initialQuery || '')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recents] = useState(readRecents)
  const selectedResultRef = useRef(null)

  const searchIndexes = useMemo(
    () =>
      new Map(
        GROUPS.filter(group => group !== 'actions').map(group => [
          group,
          new Fuse(
            documents.filter(item => item.provider === group),
            {
              threshold: 0.38,
              distance: 120,
              ignoreLocation: true,
              includeScore: true,
              keys:
                group === 'history'
                  ? [{ name: 'body', weight: 1 }]
                  : [
                      { name: 'title', weight: 0.5 },
                      { name: 'keywords', weight: 0.25 },
                      { name: 'body', weight: 0.17 },
                      { name: 'subtitle', weight: 0.08 },
                    ],
            },
          ),
        ]),
      ),
    [documents],
  )

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) {
      const currentById = new Map(documents.map(item => [item.id, item]))
      const recentResults = recents
        .map(item => currentById.get(item.id) || item)
        .filter(item => item.provider !== 'history' || currentById.has(item.id))
      return [...recentResults, ...buildQuickActions(t)]
    }

    const grouped = GROUPS.filter(group => group !== 'actions').flatMap(group =>
      (searchIndexes.get(group)?.search(normalized, { limit: 7 }) || [])
        .map(match => {
          const title = match.item.title?.toLocaleLowerCase() ?? ''
          let score = match.score ?? 1

          if (group !== 'history') {
            if (title === normalized) {
              score -= 1
            } else if (title.startsWith(normalized)) {
              score -= 0.15
            } else if (title.includes(normalized)) {
              score -= 0.08
            }
          }

          return { ...match.item, score }
        })
        .sort((a, b) => a.score - b.score),
    )
    grouped.push({
      id: 'action:filter-tasks',
      provider: 'actions',
      title: t('search.actions.filterTasks', { query: query.trim() }),
      subtitle: t('search.actions.filterTasksSubtitle'),
      route: `/chores?search=${encodeURIComponent(query.trim())}`,
    })
    return grouped
  }, [documents, query, recents, searchIndexes, t])

  useEffect(() => {
    selectedResultRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  }, [selectedIndex, results])

  const selectResult = result => {
    saveRecent(result)
    navigate(result.route)
    if (presentation === 'modal') onClose()
  }

  const onInputKeyDown = event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex(index => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex(index => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && results[selectedIndex]) {
      event.preventDefault()
      selectResult(results[selectedIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <SearchContainer onClose={onClose} presentation={presentation}>
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Input
          autoFocus
          slotProps={{
            input: {
              ref: focusInputRef,
              'aria-label': t('search.inputAriaLabel'),
            },
          }}
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setSelectedIndex(0)
          }}
          onKeyDown={onInputKeyDown}
          placeholder={t('search.placeholder')}
          startDecorator={<SearchRounded />}
          endDecorator={
            isLoading ? (
              <CircularProgress size='sm' />
            ) : presentation === 'modal' ? (
              <Chip size='sm' variant='outlined'>
                {t('search.escape')}
              </Chip>
            ) : null
          }
          sx={{
            '--Input-minHeight': '48px',
            fontSize: 'md',
            borderRadius: 'lg',
          }}
        />
        <Typography
          level='body-xs'
          sx={{ color: 'text.tertiary', mt: 1, px: 0.5 }}
        >
          {t('search.deviceNote')}
        </Typography>
      </Box>
      <Divider />

      <Box
        sx={{
          overflowY: 'auto',
          flex: 1,
          pb: 'var(--safe-area-inset-bottom, 0px)',
        }}
      >
        {!isLoading && query.trim() && results.length === 1 && (
          <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
            <InboxOutlined
              sx={{ fontSize: 36, color: 'text.tertiary', mb: 1 }}
            />
            <Typography level='title-md'>{t('search.empty.title')}</Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('search.empty.subtitle')}
            </Typography>
          </Box>
        )}

        <List aria-live='polite' sx={{ px: 1, py: 1 }}>
          {results.map((result, index) => {
            const hasQuery = Boolean(query.trim())
            const showHeading = hasQuery
              ? index === 0 || result.provider !== results[index - 1].provider
              : index === 0 ||
                (result.provider === 'actions' &&
                  results[index - 1].provider !== 'actions')
            return (
              <Box key={result.id}>
                {showHeading && (
                  <Typography
                    level='body-xs'
                    sx={{
                      color: 'text.tertiary',
                      fontWeight: 'lg',
                      px: 1.5,
                      pt: index ? 2 : 0.5,
                      pb: 0.5,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {!query.trim() && result.provider !== 'actions'
                      ? t('search.recent')
                      : t(`search.groups.${result.provider}`)}
                  </Typography>
                )}
                <ListItemButton
                  ref={index === selectedIndex ? selectedResultRef : null}
                  selected={index === selectedIndex}
                  onMouseMove={() => setSelectedIndex(index)}
                  onClick={() => selectResult(result)}
                  sx={{
                    borderRadius: 'md',
                    py: 1.1,
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemDecorator
                    sx={{ mt: 0.25, color: result.color || 'text.secondary' }}
                  >
                    {ICONS[result.provider]}
                  </ListItemDecorator>
                  <ListItemContent>
                    <Typography
                      level='title-sm'
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      <Highlight query={query} text={result.title} />
                    </Typography>
                    <Typography
                      level='body-xs'
                      sx={{ color: 'text.secondary' }}
                      noWrap
                    >
                      {[result.subtitle, result.body]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </ListItemContent>
                </ListItemButton>
              </Box>
            )
          })}
        </List>
      </Box>
      <Divider />
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          gap: 2,
          px: 2,
          py: 1,
          color: 'text.tertiary',
        }}
      >
        <Typography level='body-xs'>
          ↑↓ {t('search.footer.navigate')}
        </Typography>
        <Typography level='body-xs'>↵ {t('search.footer.open')}</Typography>
        <Typography level='body-xs' sx={{ ml: 'auto' }}>
          {query.trim()
            ? t('search.footer.results', {
                count: Math.max(0, results.length - 1),
              })
            : t('search.footer.typeToSearch')}
        </Typography>
      </Box>
    </SearchContainer>
  )
}

SearchContainer.propTypes = {
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
  presentation: PropTypes.oneOf(['modal', 'page']).isRequired,
}

Highlight.propTypes = {
  query: PropTypes.string.isRequired,
  text: PropTypes.string,
}

GlobalSearchPalette.propTypes = {
  documents: PropTypes.arrayOf(PropTypes.object).isRequired,
  initialQuery: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  presentation: PropTypes.oneOf(['modal', 'page']),
}

export default GlobalSearchPalette
