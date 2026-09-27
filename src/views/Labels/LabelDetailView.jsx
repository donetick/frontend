import {
  Close,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert,
  Search,
  SearchOff,
  Style,
  ViewAgenda,
  ViewModule,
} from '@mui/icons-material'
import {
  Box,
  Chip,
  Container,
  Divider,
  Dropdown,
  IconButton,
  Input,
  List,
  Menu,
  MenuButton,
  MenuItem,
  Stack,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import moment from 'moment'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import { useChores } from '../../queries/ChoreQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { DeleteLabel } from '../../utils/Fetcher'
import ChoreListView from '../Chores/ChoreListView'
import LoadingComponent from '../components/Loading'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import LabelModal from '../Modals/Inputs/LabelModal'
import { useLabels } from './LabelQueries'

const EMPTY_SELECTION = new Set()

const LabelDetailView = () => {
  const { t } = useTranslation('labels')
  const { labelId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: labels, isLoading: isLabelsLoading } = useLabels()
  const { data: choresData, isLoading: isChoresLoading } = useChores(false)
  const { data: membersData, isLoading: isMembersLoading } = useCircleMembers()
  const { data: userProfile } = useUserProfile()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmationModel, setConfirmationModel] = useState({})
  const [viewMode, setViewMode] = useState(
    localStorage.getItem('labelDetailViewMode') || 'default',
  )
  const searchInputRef = useRef(null)

  const label = useMemo(
    () => (labels || []).find(item => String(item.id) === String(labelId)),
    [labels, labelId],
  )

  // Tasks carrying this label, soonest due first — undated tasks sink to the
  // bottom rather than sorting as epoch 0.
  const labelChores = useMemo(() => {
    const chores = choresData?.res || []
    return chores
      .filter(chore =>
        chore.labelsV2?.some(item => String(item.id) === String(labelId)),
      )
      .sort((a, b) => {
        if (!a.nextDueDate) return 1
        if (!b.nextDueDate) return -1
        return new Date(a.nextDueDate) - new Date(b.nextDueDate)
      })
  }, [choresData, labelId])

  // Buckets are exclusive: a task due at 9am today is overdue by 3pm, and
  // counting it under both "overdue" and "today" would make the chips add up
  // to more than the task count.
  const bucketOf = chore => {
    if (!chore.nextDueDate) return 'undated'
    if (moment(chore.nextDueDate).isBefore()) return 'overdue'
    if (moment(chore.nextDueDate).isSame(moment(), 'day')) return 'today'
    return 'upcoming'
  }

  const counts = useMemo(() => {
    const tally = { overdue: 0, today: 0, undated: 0 }
    labelChores.forEach(chore => {
      const bucket = bucketOf(chore)
      if (bucket in tally) tally[bucket] += 1
    })
    return { ...tally, all: labelChores.length }
  }, [labelChores])

  const fuse = useMemo(
    () =>
      new Fuse(labelChores, {
        keys: ['name', 'description'],
        includeScore: true,
        isCaseSensitive: false,
        findAllMatches: true,
      }),
    [labelChores],
  )

  const visibleChores = useMemo(() => {
    const searched = searchTerm
      ? fuse.search(searchTerm).map(result => result.item)
      : labelChores
    if (statusFilter === 'all') return searched
    return searched.filter(chore => bucketOf(chore) === statusFilter)
  }, [fuse, searchTerm, labelChores, statusFilter])

  const handleSearchClose = () => {
    setSearchTerm('')
    searchInputRef.current?.blur()
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    searchInputRef.current?.blur()
  }

  const toggleViewMode = () => {
    const newMode = viewMode === 'default' ? 'compact' : 'default'
    setViewMode(newMode)
    localStorage.setItem('labelDetailViewMode', newMode)
  }

  const handleSaveLabel = () => {
    queryClient.invalidateQueries({ queryKey: ['labels'] })
    setModalOpen(false)
  }

  const handleDeleteClicked = () => {
    setConfirmationModel({
      isOpen: true,
      title: t('delete.title'),
      message: t('delete.message'),
      confirmText: t('common:delete'),
      color: 'danger',
      cancelText: t('common:cancel'),
      onClose: confirmed => {
        if (confirmed === true) {
          DeleteLabel(label.id).then(() => {
            queryClient.invalidateQueries({ queryKey: ['labels'] })
            navigate('/labels')
          })
        }
        setConfirmationModel({})
      },
    })
  }

  if (isLabelsLoading || isChoresLoading || isMembersLoading) {
    return <LoadingComponent />
  }

  if (!label) {
    return (
      <Container maxWidth='md'>
        <EmptyState
          variant='error'
          fullHeight
          icon={<Style />}
          title={t('detail.notFoundTitle')}
          description={t('detail.notFoundDescription')}
          primaryAction={{ label: t('detail.backToLabels'), to: '/labels' }}
        />
      </Container>
    )
  }

  const isOwnedByCurrentUser = label.created_by === userProfile?.id

  return (
    <Container maxWidth='md'>
      {/* Identity: the label's own color is what names this page, so it leads
          the title rather than sitting in a decorative avatar. */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
        <Stack sx={{ flex: 1, minWidth: 0, gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: label.color,
                flexShrink: 0,
              }}
            />
            <Typography
              level='h3'
              sx={{
                fontWeight: 'lg',
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label.name}
            </Typography>
            {!isOwnedByCurrentUser && (
              <Chip size='sm' variant='soft' color='warning'>
                {t('shared')}
              </Chip>
            )}
          </Box>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('detail.taskCount', { count: counts.all })}
          </Typography>
        </Stack>

        {/* One trailing target. Delete is destructive, so it lives behind the
            overflow instead of being a naked icon next to the title. */}
        <Dropdown>
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{ root: { variant: 'plain', color: 'neutral' } }}
            aria-label={t('detail.labelActions')}
          >
            <MoreVert />
          </MenuButton>
          <Menu placement='bottom-end'>
            <MenuItem onClick={() => setModalOpen(true)}>
              <EditIcon fontSize='small' />
              {t('common:edit')}
            </MenuItem>
            <Divider />
            <MenuItem color='danger' onClick={handleDeleteClicked}>
              <DeleteIcon fontSize='small' />
              {t('common:delete')}
            </MenuItem>
          </Menu>
        </Dropdown>
      </Box>

      {/* Status chips double as the filter control: the counts users want to
          read are the cuts they want to make. */}
      {labelChores.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mb: 2,
            overflowX: 'auto',
            pb: 0.5,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {[
            { id: 'all', label: t('detail.filters.all'), color: 'neutral' },
            {
              id: 'overdue',
              label: t('detail.filters.overdue'),
              color: 'danger',
            },
            { id: 'today', label: t('detail.filters.today'), color: 'primary' },
            {
              id: 'undated',
              label: t('detail.filters.undated'),
              color: 'neutral',
            },
          ]
            .filter(chip => chip.id === 'all' || counts[chip.id] > 0)
            .map(chip => {
              const isSelected = statusFilter === chip.id
              return (
                <Chip
                  key={chip.id}
                  variant={isSelected ? 'solid' : 'soft'}
                  color={chip.color}
                  onClick={() => setStatusFilter(chip.id)}
                  aria-pressed={isSelected}
                  sx={{ flexShrink: 0 }}
                  endDecorator={
                    <Typography
                      level='body-xs'
                      sx={{ color: 'inherit', fontWeight: 'lg' }}
                    >
                      {counts[chip.id]}
                    </Typography>
                  }
                >
                  {chip.label}
                </Chip>
              )
            })}
        </Box>
      )}

      {/* Search + view mode */}
      {labelChores.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mb: 2,
          }}
        >
          <Input
            slotProps={{ input: { ref: searchInputRef } }}
            placeholder={t('detail.searchPlaceholder')}
            value={searchTerm}
            fullWidth
            sx={{
              borderRadius: 24,
              height: 24,
              borderColor: 'text.disabled',
              padding: 1,
            }}
            onChange={e => setSearchTerm(e.target.value.toLowerCase())}
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
          <IconButton
            variant='outlined'
            color='neutral'
            size='sm'
            sx={{ height: 32, width: 32, borderRadius: '50%' }}
            onClick={toggleViewMode}
          >
            {viewMode === 'default' ? <ViewAgenda /> : <ViewModule />}
          </IconButton>
        </Box>
      )}

      {/* Tasks */}
      {labelChores.length === 0 ? (
        <EmptyState
          fullHeight
          icon={<Style />}
          title={t('detail.emptyTitle')}
          description={t('detail.emptyDescription', { label: label.name })}
          primaryAction={{ label: t('detail.browseTasks'), to: '/chores' }}
        />
      ) : visibleChores.length === 0 ? (
        <EmptyState
          variant='no-results'
          fullHeight
          icon={<SearchOff />}
          title={t('detail.noResultsTitle')}
          description={
            searchTerm
              ? t('detail.noResultsDescription', { searchTerm })
              : t('detail.noMatchingStatus')
          }
          primaryAction={{
            label: t('detail.clearFilters'),
            onClick: resetFilters,
          }}
        />
      ) : (
        <List sx={{ gap: viewMode === 'compact' ? 0 : 1 }}>
          <ChoreListView
            chores={visibleChores}
            viewMode={viewMode}
            membersData={membersData}
            userLabels={labels}
            userProfile={userProfile}
            showActions={false}
            selectedChores={EMPTY_SELECTION}
          />
        </List>
      )}

      {modalOpen && (
        <LabelModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveLabel}
          label={label}
        />
      )}
      <ConfirmationModal config={confirmationModel} />
    </Container>
  )
}

export default LabelDetailView
