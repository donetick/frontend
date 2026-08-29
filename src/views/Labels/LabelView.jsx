import '@meauxt/react-swipeable-list/dist/styles.css'

import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
  Type as ListType,
} from '@meauxt/react-swipeable-list'
import {
  Add,
  Close,
  MoreVert,
  Search,
  SearchOff,
  Style,
} from '@mui/icons-material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Input,
  Stack,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import SortAndFilterMenu from '../../components/common/SortAndFilterMenu'
import { useUserProfile } from '../../queries/UserQueries'
import { getTextColorFromBackgroundColor } from '../../utils/Colors'
import { DeleteLabel } from '../../utils/Fetcher'
import { getSafeBottomStyles } from '../../utils/SafeAreaUtils'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import LabelModal from '../Modals/Inputs/LabelModal'
import { useLabels } from './LabelQueries'

const LabelCardContent = ({ currentUserId, label, onToggleActions }) => {
  const { t } = useTranslation('labels')
  // Check if current user owns this label
  const isOwnedByCurrentUser = label.created_by === currentUserId

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 64,
        width: '100%',
        px: 2,
        py: 1.5,
        bgcolor: 'background.body',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Color Avatar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mr: 2,
          flexShrink: 0,
        }}
      >
        <Avatar
          size='sm'
          sx={{
            width: 32,
            height: 32,
            bgcolor: label.color,
            border: '2px solid',
            borderColor: isOwnedByCurrentUser
              ? 'background.surface'
              : 'warning.300',
            boxShadow: isOwnedByCurrentUser
              ? 'sm'
              : '0 0 0 1px var(--joy-palette-warning-300)',
          }}
        >
          <Typography
            level='body-xs'
            sx={{
              color: getTextColorFromBackgroundColor(label.color),
              fontWeight: 'bold',
              fontSize: 10,
            }}
          >
            {label.name.charAt(0).toUpperCase()}
          </Typography>
        </Avatar>
      </Box>

      {/* Content - Center */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Label Name */}
        <Typography
          level='title-sm'
          sx={{
            fontWeight: 600,
            fontSize: 14,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mb: 0.25,
          }}
        >
          {label.name}
        </Typography>

        {/* Color Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {!isOwnedByCurrentUser && (
            <Chip
              size='sm'
              variant='soft'
              color='warning'
              sx={{
                fontSize: 9,
                height: 16,
                px: 0.5,
                fontWeight: 'md',
              }}
            >
              {t('shared')}
            </Chip>
          )}
        </Box>
      </Box>
      <Box>
        {onToggleActions && (
          <IconButton
            color='neutral'
            variant='plain'
            size='sm'
            onClick={e => {
              e.stopPropagation()
              onToggleActions()
            }}
          >
            <MoreVert sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  )
}

const LabelView = () => {
  const { t } = useTranslation('labels')
  const { data: labels, isError, isLabelsLoading } = useLabels()
  const { data: userProfile } = useUserProfile()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [userLabels, setUserLabels] = useState([])
  const [modalOpen, setModalOpen] = useState(false)

  const [currentLabel, setCurrentLabel] = useState(null)
  const queryClient = useQueryClient()
  const [confirmationModel, setConfirmationModel] = useState({})
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem('labelsSortBy') || 'name',
  )
  const [sortDirection, setSortDirection] = useState(
    () => localStorage.getItem('labelsSortDirection') || 'asc',
  )
  const [ownershipFilter, setOwnershipFilter] = useState('all')
  const searchInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('labelsSortBy', sortBy)
    localStorage.setItem('labelsSortDirection', sortDirection)
  }, [sortBy, sortDirection])

  const visibleLabels = useMemo(() => {
    if (ownershipFilter === 'mine') {
      return userLabels.filter(label => label.created_by === userProfile?.id)
    }
    if (ownershipFilter === 'shared') {
      return userLabels.filter(label => label.created_by !== userProfile?.id)
    }
    return userLabels
  }, [ownershipFilter, userLabels, userProfile?.id])

  const fuse = useMemo(
    () =>
      new Fuse(visibleLabels, {
        keys: ['name'],
        includeScore: true,
        isCaseSensitive: false,
        findAllMatches: true,
      }),
    [visibleLabels],
  )

  const filteredLabels = useMemo(() => {
    const matched = searchTerm
      ? fuse.search(searchTerm).map(result => result.item)
      : visibleLabels

    const direction = sortDirection === 'desc' ? -1 : 1
    return [...matched].sort((a, b) => {
      switch (sortBy) {
        case 'color':
          return direction * (a.color || '').localeCompare(b.color || '')
        case 'created':
          return direction * ((a.id || 0) - (b.id || 0))
        case 'name':
        default:
          return direction * (a.name || '').localeCompare(b.name || '')
      }
    })
  }, [fuse, searchTerm, visibleLabels, sortBy, sortDirection])

  const handleSearchChange = e => {
    setSearchTerm(e.target.value.toLowerCase())
    setShowMoreInfoId(null)
  }

  const handleSearchClose = () => {
    setSearchTerm('')
    searchInputRef.current?.blur()
  }

  const handleAddLabel = () => {
    setCurrentLabel(null)
    setModalOpen(true)
  }

  const handleEditLabel = label => {
    setCurrentLabel(label)
    setModalOpen(true)
  }

  const handleDeleteClicked = id => {
    setConfirmationModel({
      isOpen: true,
      title: t('delete.title'),
      message: t('delete.message'),
      confirmText: t('common:delete'),
      color: 'danger',
      cancelText: t('common:cancel'),
      onClose: confirmed => {
        if (confirmed === true) {
          handleDeleteLabel(id)
        }
        setConfirmationModel({})
      },
    })
  }

  const handleDeleteLabel = id => {
    DeleteLabel(id).then(() => {
      const updatedLabels = userLabels.filter(label => label.id !== id)
      setUserLabels(updatedLabels)

      queryClient.invalidateQueries('labels')
    })
  }

  const handleSaveLabel = newOrUpdatedLabel => {
    queryClient.invalidateQueries('labels')
    setModalOpen(false)
    const updatedLabels = userLabels.map(label =>
      label.id === newOrUpdatedLabel.id ? newOrUpdatedLabel : label,
    )
    setUserLabels(updatedLabels)
  }

  useEffect(() => {
    if (labels) {
      setUserLabels(labels)
    }
  }, [labels])

  // ?create=1 lets other surfaces (global search quick actions) land here with
  // the create modal already open.
  useEffect(() => {
    if (searchParams.get('create') !== '1') return
    setCurrentLabel(null)
    setModalOpen(true)
    setSearchParams(
      params => {
        params.delete('create')
        return params
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  if (isLabelsLoading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100vh'
      >
        <CircularProgress />
      </Box>
    )
  }

  if (isError) {
    return (
      <Typography color='danger' textAlign='center'>
        {t('loadError')}
      </Typography>
    )
  }

  return (
    <Container maxWidth='md' sx={{ px: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2 }}>
        {/* <EmojiEvents sx={{ fontSize: '2rem', color: '#FFD700' }} /> */}
        <Stack sx={{ flex: 1 }}>
          <Typography
            level='h3'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            {t('common:navigation.labels')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('blurb')}
          </Typography>
        </Stack>
      </Box>
      {userLabels.length > 0 && (
        <Box
          sx={{ px: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Input
            slotProps={{ input: { ref: searchInputRef } }}
            placeholder={t('search.placeholder')}
            value={searchTerm}
            fullWidth
            sx={{
              borderRadius: 24,
              height: 24,
              borderColor: 'text.disabled',
              padding: 1,
            }}
            onChange={handleSearchChange}
            startDecorator={<Search />}
            endDecorator={
              searchTerm && (
                <IconButton
                  variant='plain'
                  size='sm'
                  onClick={handleSearchClose}
                  sx={{ borderRadius: '50%' }}
                >
                  <Close />
                </IconButton>
              )
            }
          />
          <SortAndFilterMenu
            sortOptions={[
              { name: t('view.sortName'), value: 'name' },
              { name: t('view.sortColor'), value: 'color' },
              { name: t('view.sortRecent'), value: 'created' },
            ]}
            selectedSort={sortBy}
            onSortChange={setSortBy}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
            filterTitle={t('view.filterTitle')}
            filterOptions={[
              { name: t('view.filterAll'), value: 'all' },
              { name: t('view.filterMine'), value: 'mine' },
              { name: t('view.filterShared'), value: 'shared' },
            ]}
            selectedFilter={ownershipFilter}
            onFilterChange={value => {
              setOwnershipFilter(value)
              setShowMoreInfoId(null)
            }}
            isActive={
              ownershipFilter !== 'all' ||
              sortBy !== 'name' ||
              sortDirection !== 'asc'
            }
          />
        </Box>
      )}
      <Box
        sx={{
          overflow: 'hidden',
        }}
      >
        {userLabels.length === 0 && (
          <EmptyState
            fullHeight
            icon={<Style />}
            title={t('view.emptyTitle')}
            description={t('view.emptyDescription')}
            primaryAction={{
              label: t('view.createLabel'),
              startDecorator: <Add />,
              onClick: handleAddLabel,
            }}
          />
        )}
        {userLabels.length > 0 && filteredLabels.length === 0 && (
          <EmptyState
            variant='no-results'
            fullHeight
            icon={<SearchOff />}
            title={t('search.noResultsTitle')}
            description={
              searchTerm
                ? t('search.noResultsDescription', { searchTerm })
                : t('search.noFilterResultsDescription')
            }
            primaryAction={{
              label: searchTerm ? t('search.clear') : t('search.showAll'),
              onClick: () => {
                handleSearchClose()
                setOwnershipFilter('all')
              },
            }}
          />
        )}
        <SwipeableList type={ListType.IOS} fullSwipe={false}>
          {filteredLabels.map(label => (
            <SwipeableListItem
              key={label.id}
              onClick={() => navigate(`/labels/${label.id}`)}
              swipeActionOpen={showMoreInfoId === label.id ? 'trailing' : null}
              trailingActions={
                <TrailingActions>
                  <Box
                    sx={{
                      display: 'flex',
                      boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.06)',
                      zIndex: 0,
                    }}
                  >
                    <SwipeAction onClick={() => handleEditLabel(label)}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'neutral.softBg',
                          color: 'neutral.700',
                          px: 3,
                          height: '100%',
                        }}
                      >
                        <EditIcon sx={{ fontSize: 20 }} />
                        <Typography level='body-xs' sx={{ mt: 0.5 }}>
                          {t('common:edit')}
                        </Typography>
                      </Box>
                    </SwipeAction>
                    <SwipeAction onClick={() => handleDeleteClicked(label.id)}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'danger.softBg',
                          color: 'danger.700',
                          px: 3,
                          height: '100%',
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 20 }} />
                        <Typography level='body-xs' sx={{ mt: 0.5 }}>
                          {t('common:delete')}
                        </Typography>
                      </Box>
                    </SwipeAction>
                  </Box>
                </TrailingActions>
              }
            >
              <LabelCardContent
                label={label}
                currentUserId={userProfile?.id}
                onToggleActions={() => {
                  if (showMoreInfoId === label.id) {
                    setShowMoreInfoId(null)
                  } else {
                    setShowMoreInfoId(label.id)
                  }
                }}
              />
            </SwipeableListItem>
          ))}
        </SwipeableList>
      </Box>

      {modalOpen && (
        <LabelModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveLabel}
          label={currentLabel}
        />
      )}

      <Box
        sx={{
          ...getSafeBottomStyles({ bottom: 0, padding: 16 }),
          left: 10,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          'z-index': 1000,
        }}
      >
        <IconButton
          color='primary'
          variant='solid'
          sx={{
            borderRadius: '50%',
            width: 50,
            height: 50,
          }}
          onClick={handleAddLabel}
        >
          <Add />
        </IconButton>
      </Box>
      <ConfirmationModal config={confirmationModel} />
    </Container>
  )
}

export default LabelView
