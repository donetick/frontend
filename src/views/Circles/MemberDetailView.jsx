import {
  Close,
  Person,
  Search,
  SearchOff,
  ViewAgenda,
  ViewModule,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Chip,
  Container,
  IconButton,
  Input,
  List,
  Stack,
  Typography,
} from '@mui/joy'
import Fuse from 'fuse.js'
import moment from 'moment'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import { useChores } from '../../queries/ChoreQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { resolvePhotoURL } from '../../utils/Helpers'
import ChoreListView from '../Chores/ChoreListView'
import LoadingComponent from '../components/Loading'
import { useLabels } from '../Labels/LabelQueries'

const EMPTY_SELECTION = new Set()

const MemberDetailView = () => {
  const { t } = useTranslation('chores')
  const { userId } = useParams()

  const { data: choresData, isLoading: isChoresLoading } = useChores(false)
  const { data: membersData, isLoading: isMembersLoading } = useCircleMembers()
  const { data: labels } = useLabels()
  const { data: userProfile } = useUserProfile()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState(
    localStorage.getItem('memberDetailViewMode') || 'default',
  )
  const searchInputRef = useRef(null)

  const member = useMemo(
    () =>
      (membersData?.res || []).find(
        item => String(item.userId) === String(userId),
      ),
    [membersData, userId],
  )

  // Tasks currently on this person's plate, soonest due first — undated tasks
  // sink to the bottom rather than sorting as epoch 0.
  const memberChores = useMemo(() => {
    const chores = choresData?.res || []
    return chores
      .filter(chore => String(chore.assignedTo) === String(userId))
      .sort((a, b) => {
        if (!a.nextDueDate) return 1
        if (!b.nextDueDate) return -1
        return new Date(a.nextDueDate) - new Date(b.nextDueDate)
      })
  }, [choresData, userId])

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
    memberChores.forEach(chore => {
      const bucket = bucketOf(chore)
      if (bucket in tally) tally[bucket] += 1
    })
    return { ...tally, all: memberChores.length }
  }, [memberChores])

  const fuse = useMemo(
    () =>
      new Fuse(memberChores, {
        keys: ['name', 'description'],
        includeScore: true,
        isCaseSensitive: false,
        findAllMatches: true,
      }),
    [memberChores],
  )

  const visibleChores = useMemo(() => {
    const searched = searchTerm
      ? fuse.search(searchTerm).map(result => result.item)
      : memberChores
    if (statusFilter === 'all') return searched
    return searched.filter(chore => bucketOf(chore) === statusFilter)
  }, [fuse, searchTerm, memberChores, statusFilter])

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
    localStorage.setItem('memberDetailViewMode', newMode)
  }

  if (isChoresLoading || isMembersLoading) {
    return <LoadingComponent />
  }

  if (!member) {
    return (
      <Container maxWidth='md'>
        <EmptyState
          variant='error'
          fullHeight
          icon={<Person />}
          title={t('memberDetail.notFoundTitle')}
          description={t('memberDetail.notFoundDescription')}
          primaryAction={{
            label: t('memberDetail.browseTasks'),
            to: '/chores',
          }}
        />
      </Container>
    )
  }

  const memberName = member.displayName || member.name || member.username
  const isCurrentUser = String(member.userId) === String(userProfile?.id)

  return (
    <Container maxWidth='md'>
      {/* Identity: the person is the page, so their avatar leads the title the
          same way a label's color does on the label page. */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
        <Stack sx={{ flex: 1, minWidth: 0, gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar size='sm' src={resolvePhotoURL(member.image)}>
              {memberName?.charAt(0) || <Person />}
            </Avatar>
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
              {memberName}
            </Typography>
            {isCurrentUser && (
              <Chip size='sm' variant='soft' color='primary'>
                {t('memberDetail.you')}
              </Chip>
            )}
          </Box>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('memberDetail.taskCount', { count: counts.all })}
          </Typography>
        </Stack>
      </Box>

      {/* Status chips double as the filter control: the counts users want to
          read are the cuts they want to make. */}
      {memberChores.length > 0 && (
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
            {
              id: 'all',
              label: t('memberDetail.filters.all'),
              color: 'neutral',
            },
            {
              id: 'overdue',
              label: t('memberDetail.filters.overdue'),
              color: 'danger',
            },
            {
              id: 'today',
              label: t('memberDetail.filters.today'),
              color: 'primary',
            },
            {
              id: 'undated',
              label: t('memberDetail.filters.undated'),
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
      {memberChores.length > 0 && (
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
            placeholder={t('memberDetail.searchPlaceholder')}
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
      {memberChores.length === 0 ? (
        <EmptyState
          fullHeight
          icon={<Person />}
          title={t('memberDetail.emptyTitle')}
          description={t('memberDetail.emptyDescription', { name: memberName })}
          primaryAction={{
            label: t('memberDetail.browseTasks'),
            to: '/chores',
          }}
        />
      ) : visibleChores.length === 0 ? (
        <EmptyState
          variant='no-results'
          fullHeight
          icon={<SearchOff />}
          title={t('memberDetail.noResultsTitle')}
          description={
            searchTerm
              ? t('memberDetail.noResultsDescription', { searchTerm })
              : t('memberDetail.noMatchingStatus')
          }
          primaryAction={{
            label: t('memberDetail.clearFilters'),
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
    </Container>
  )
}

export default MemberDetailView
