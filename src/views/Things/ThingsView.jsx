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
  Delete,
  Edit,
  Flip,
  MoreVert,
  PlusOne,
  Search,
  SearchOff,
  ToggleOff,
  ToggleOn,
  Widgets,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Chip,
  Container,
  IconButton,
  Input,
  Stack,
  Typography,
} from '@mui/joy'
import Fuse from 'fuse.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { track } from '../../analytics'
import EmptyState from '../../components/common/EmptyState'
import SortAndFilterMenu from '../../components/common/SortAndFilterMenu'
import { useNotification } from '../../service/NotificationProvider'
import {
  CreateThing,
  DeleteThing,
  GetThings,
  SaveThing,
  UpdateThingState,
} from '../../utils/Fetcher'
import { getSafeBottomStyles } from '../../utils/SafeAreaUtils'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import CreateThingModal from '../Modals/Inputs/CreateThingModal'
import EditThingStateModal from '../Modals/Inputs/EditThingState'

const ThingCardContent = ({ onCardClick, onToggleActions, thing }) => {
  const { t } = useTranslation('things')
  const getThingIcon = type => {
    if (type === 'text') {
      return <Flip />
    } else if (type === 'number') {
      return <PlusOne />
    } else if (type === 'boolean') {
      if (thing.state === 'true') {
        return <ToggleOn />
      } else {
        return <ToggleOff />
      }
    } else {
      return <ToggleOff />
    }
  }

  const getThingAvatar = () => {
    const typeConfig = {
      text: { color: 'primary', icon: <Flip /> },
      number: { color: 'success', icon: <PlusOne /> },
      boolean: {
        color: thing.state === 'true' ? 'success' : 'neutral',
        icon: thing.state === 'true' ? <ToggleOn /> : <ToggleOff />,
      },
    }

    const config = typeConfig[thing?.type] || typeConfig.boolean
    return (
      <Avatar
        size='sm'
        color={config.color}
        variant='soft'
        sx={{
          width: 32,
          height: 32,
          '& svg': { fontSize: '16px' },
        }}
      >
        {config.icon}
      </Avatar>
    )
  }

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
        cursor: 'pointer',
      }}
      onClick={onCardClick}
    >
      {/* Avatar and Primary Action */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mr: 2,
          flexShrink: 0,
        }}
      >
        {getThingAvatar()}
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
        {/* Line 1: Name + State */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 0.5,
          }}
        >
          <Typography
            level='title-sm'
            sx={{
              fontWeight: 600,
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mr: 1,
              flex: 1,
              minWidth: 0,
            }}
          >
            {thing?.name}
          </Typography>

          <Chip
            size='sm'
            variant='solid'
            color={
              thing?.type === 'boolean' && thing?.state === 'true'
                ? 'success'
                : 'primary'
            }
            sx={{
              fontSize: 11,
              height: 20,
              px: 1,
              fontWeight: 'md',
              flexShrink: 0,
              ml: 1,
            }}
          >
            {thing?.state}
          </Chip>
        </Box>

        {/* Line 2: Type */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip
            size='sm'
            variant='soft'
            color='neutral'
            sx={{
              fontSize: 10,
              height: 18,
              px: 0.75,
            }}
          >
            {t(`types.${thing?.type}`, thing?.type)}
          </Chip>
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

const ThingsView = () => {
  const { t } = useTranslation('things')
  const navigate = useNavigate()
  const [things, setThings] = useState([])
  const [isShowCreateThingModal, setIsShowCreateThingModal] = useState(false)
  const [isShowEditThingStateModal, setIsShowEditStateModal] = useState(false)
  const [createModalThing, setCreateModalThing] = useState(null)
  const [confirmModelConfig, setConfirmModelConfig] = useState({})
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem('thingsSortBy') || 'name',
  )
  const [sortDirection, setSortDirection] = useState(
    () => localStorage.getItem('thingsSortDirection') || 'asc',
  )
  const [typeFilter, setTypeFilter] = useState('all')
  const searchInputRef = useRef(null)
  const { showError, showNotification } = useNotification()

  useEffect(() => {
    localStorage.setItem('thingsSortBy', sortBy)
    localStorage.setItem('thingsSortDirection', sortDirection)
  }, [sortBy, sortDirection])

  const visibleThings = useMemo(
    () =>
      typeFilter === 'all'
        ? things
        : things.filter(thing => thing?.type === typeFilter),
    [things, typeFilter],
  )

  const fuse = useMemo(
    () =>
      new Fuse(visibleThings, {
        keys: ['name', 'state'],
        includeScore: true,
        isCaseSensitive: false,
        findAllMatches: true,
      }),
    [visibleThings],
  )

  const filteredThings = useMemo(() => {
    const matched = searchTerm
      ? fuse.search(searchTerm).map(result => result.item)
      : visibleThings

    const direction = sortDirection === 'desc' ? -1 : 1
    return [...matched].sort((a, b) => {
      switch (sortBy) {
        case 'type':
          return direction * (a.type || '').localeCompare(b.type || '')
        case 'state':
          return (
            direction *
            String(a.state ?? '').localeCompare(String(b.state ?? ''))
          )
        case 'updated': {
          const aDate = new Date(a.updatedAt || a.updated_at || 0).getTime()
          const bDate = new Date(b.updatedAt || b.updated_at || 0).getTime()
          return direction * (aDate - bDate)
        }
        case 'name':
        default:
          return direction * (a.name || '').localeCompare(b.name || '')
      }
    })
  }, [fuse, searchTerm, visibleThings, sortBy, sortDirection])

  const handleSearchChange = e => {
    setSearchTerm(e.target.value)
    setShowMoreInfoId(null)
  }

  const handleSearchClose = () => {
    setSearchTerm('')
    searchInputRef.current?.blur()
  }

  useEffect(() => {
    // fetch things
    GetThings().then(result => {
      result.json().then(data => {
        setThings(data.res)
      })
    })
  }, [])

  const handleSaveThing = thing => {
    let saveFunc = CreateThing
    if (thing?.id) {
      saveFunc = SaveThing
    }
    saveFunc(thing)
      .then(result => {
        result.json().then(data => {
          if (thing?.id) {
            const currentThings = [...things]
            const thingIndex = currentThings.findIndex(
              currentThing => currentThing.id === thing.id,
            )
            currentThings[thingIndex] = data.res
            setThings(currentThings)
          } else {
            const currentThings = [...things]
            currentThings.push(data.res)
            setThings(currentThings)
            track('thing_created', {})
          }
          showNotification({
            type: 'success',
            title: t('notify.savedTitle'),
            message: t('notify.savedMessage'),
          })
        })
      })
      .catch(error => {
        if (error?.queued) {
          showError({
            title: t('notify.saveFailTitle'),
            message: t('notify.queuedMessage'),
          })
        } else {
          showError({
            title: t('notify.saveFailTitle'),
            message: t('notify.saveFailMessage'),
          })
        }
      })
  }
  const handleEditClick = thing => {
    setIsShowEditStateModal(true)
    setCreateModalThing(thing)
  }
  const handleDeleteClick = thing => {
    setConfirmModelConfig({
      isOpen: true,
      title: t('notify.deleteTitle'),
      confirmText: t('common:delete'),
      cancelText: t('common:cancel'),
      message: t('notify.deleteMessage'),
      onClose: isConfirmed => {
        if (isConfirmed === true) {
          DeleteThing(thing.id)
            .then(response => {
              if (response.ok) {
                const currentThings = [...things]
                const thingIndex = currentThings.findIndex(
                  currentThing => currentThing.id === thing.id,
                )
                currentThings.splice(thingIndex, 1)
                setThings(currentThings)
              } else if (response.status === 405) {
                showError({
                  title: t('notify.deleteBlockedTitle'),
                  message: t('notify.deleteBlockedMessage'),
                })
              }
              // if method not allwo show snackbar:
            })
            .catch(error => {
              if (error?.queued) {
                showError({
                  title: t('notify.deleteFailTitle'),
                  message: t('notify.queuedMessage'),
                })
              } else {
                showError({
                  title: t('notify.deleteFailTitle'),
                  message: t('notify.deleteFailMessage'),
                })
              }
            })
        }
        setConfirmModelConfig({})
      },
    })
  }

  const handleStateChangeRequest = thing => {
    const updatedThing = { ...thing }
    if (updatedThing?.type === 'number') {
      updatedThing.state = Number(updatedThing.state) + 1
    } else if (updatedThing?.type === 'boolean') {
      if (updatedThing.state === 'true') {
        updatedThing.state = 'false'
      } else {
        updatedThing.state = 'true'
      }
    }

    UpdateThingState(updatedThing)
      .then(result => {
        result.json().then(data => {
          const currentThings = [...things]
          const thingIndex = currentThings.findIndex(
            currentThing => currentThing.id === updatedThing.id,
          )
          currentThings[thingIndex] = data.res
          setThings(currentThings)
          showNotification({
            type: 'success',
            title: t('notify.updatedTitle'),
            message: t('notify.updatedMessage'),
          })
        })
      })
      .catch(error => {
        if (error?.queued) {
          showError({
            title: t('notify.updateFailTitle'),
            message: t('notify.queuedMessage'),
          })
        } else {
          showError({
            title: t('notify.updateFailTitle'),
            message: t('notify.updateFailMessage'),
          })
        }
      })
  }

  const handleSetThingState = thing => {
    UpdateThingState(thing)
      .then(result => {
        result.json().then(data => {
          const currentThings = [...things]
          const thingIndex = currentThings.findIndex(
            currentThing => currentThing.id === thing.id,
          )
          currentThings[thingIndex] = data.res
          setThings(currentThings)
          showNotification({
            type: 'success',
            title: t('notify.updatedTitle'),
            message: t('notify.updatedMessage'),
          })
        })
      })
      .catch(error => {
        showError({
          title: t('notify.updateFailTitle'),
          message: t('notify.updateFailMessage'),
        })
      })
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
            {t('view.title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('view.description')}
          </Typography>
        </Stack>
      </Box>
      {things.length > 0 && (
        <Box
          sx={{ px: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Input
            slotProps={{ input: { ref: searchInputRef } }}
            placeholder={t('view.searchPlaceholder')}
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
              { name: t('view.sortType'), value: 'type' },
              { name: t('view.sortState'), value: 'state' },
              { name: t('view.sortUpdated'), value: 'updated' },
            ]}
            selectedSort={sortBy}
            onSortChange={setSortBy}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
            filterTitle={t('view.filterTitle')}
            filterOptions={[
              { name: t('view.filterAll'), value: 'all' },
              { name: t('types.text'), value: 'text' },
              { name: t('types.number'), value: 'number' },
              { name: t('types.boolean'), value: 'boolean' },
            ]}
            selectedFilter={typeFilter}
            onFilterChange={value => {
              setTypeFilter(value)
              setShowMoreInfoId(null)
            }}
            isActive={
              typeFilter !== 'all' ||
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
        {things.length === 0 && (
          <EmptyState
            fullHeight
            icon={<Widgets />}
            title={t('view.emptyTitle')}
            description={t('view.emptyDescription')}
            primaryAction={{
              label: t('view.emptyAction'),
              startDecorator: <Add />,
              onClick: () => {
                setCreateModalThing(null)
                setIsShowCreateThingModal(true)
              },
            }}
          />
        )}
        {things.length > 0 && filteredThings.length === 0 && (
          <EmptyState
            variant='no-results'
            fullHeight
            icon={<SearchOff />}
            title={t('view.noResultsTitle')}
            description={
              searchTerm
                ? t('view.noResultsSearch', { term: searchTerm })
                : t('view.noResultsFilter')
            }
            primaryAction={{
              label: searchTerm ? t('view.clearSearch') : t('view.showAll'),
              onClick: () => {
                handleSearchClose()
                setTypeFilter('all')
              },
            }}
          />
        )}
        <SwipeableList type={ListType.IOS} fullSwipe={false}>
          {filteredThings.map(thing => (
            <SwipeableListItem
              onClick={() => navigate(`/things/${thing?.id}`)}
              key={thing.id}
              swipeActionOpen={showMoreInfoId === thing.id ? 'trailing' : null}
              trailingActions={
                <TrailingActions>
                  <Box
                    sx={{
                      display: 'flex',
                      boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.06)',
                      zIndex: 0,
                    }}
                  >
                    <SwipeAction
                      onClick={() => {
                        if (thing?.type === 'text') {
                          handleEditClick(thing)
                        } else {
                          handleStateChangeRequest(thing)
                        }
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'success.softBg',
                          color: 'success.700',
                          px: 3,
                          height: '100%',
                        }}
                      >
                        {thing?.type === 'text' ? (
                          <Flip sx={{ fontSize: 20 }} />
                        ) : thing?.type === 'number' ? (
                          <PlusOne sx={{ fontSize: 20 }} />
                        ) : thing.state === 'true' ? (
                          <ToggleOn sx={{ fontSize: 20 }} />
                        ) : (
                          <ToggleOff sx={{ fontSize: 20 }} />
                        )}
                        <Typography level='body-xs' sx={{ mt: 0.5 }}>
                          {thing?.type === 'text'
                            ? t('common:edit')
                            : t('view.toggle')}
                        </Typography>
                      </Box>
                    </SwipeAction>
                    <SwipeAction onClick={() => handleEditClick(thing)}>
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
                        <Edit sx={{ fontSize: 20 }} />
                        <Typography level='body-xs' sx={{ mt: 0.5 }}>
                          {t('common:edit')}
                        </Typography>
                      </Box>
                    </SwipeAction>
                    <SwipeAction onClick={() => handleDeleteClick(thing)}>
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
                        <Delete sx={{ fontSize: 20 }} />
                        <Typography level='body-xs' sx={{ mt: 0.5 }}>
                          {t('common:delete')}
                        </Typography>
                      </Box>
                    </SwipeAction>
                  </Box>
                </TrailingActions>
              }
            >
              <ThingCardContent
                thing={thing}
                onToggleActions={() => {
                  if (showMoreInfoId === thing.id) {
                    setShowMoreInfoId(null)
                  } else {
                    setShowMoreInfoId(thing.id)
                  }
                }}
              />
            </SwipeableListItem>
          ))}
        </SwipeableList>
      </Box>
      <Box
        // variant='outlined'
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
          //   startDecorator={<Add />}
          onClick={() => {
            setIsShowCreateThingModal(true)
          }}
        >
          <Add />
        </IconButton>
        {isShowCreateThingModal && (
          <CreateThingModal
            isOpen={isShowCreateThingModal}
            onClose={() => {
              setIsShowCreateThingModal(false)
              setCreateModalThing(null)
            }}
            onSave={handleSaveThing}
            currentThing={createModalThing}
          />
        )}
        {isShowEditThingStateModal && (
          <EditThingStateModal
            isOpen={isShowEditThingStateModal}
            onClose={() => {
              setIsShowEditStateModal(false)
              setCreateModalThing(null)
            }}
            onSave={handleSetThingState}
            currentThing={createModalThing}
          />
        )}

        <ConfirmationModal config={confirmModelConfig} />
      </Box>
    </Container>
  )
}

export default ThingsView
