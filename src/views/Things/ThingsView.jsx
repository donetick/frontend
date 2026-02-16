import {
  Type as ListType,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from '@meauxt/react-swipeable-list'
import '@meauxt/react-swipeable-list/dist/styles.css'
import {
  Add,
  Delete,
  Edit,
  Flip,
  MoreVert,
  PlusOne,
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
  Stack,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const ThingCardContent = ({ thing, onCardClick, onToggleActions }) => {
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
            {thing?.type}
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
  const navigate = useNavigate()
  const [things, setThings] = useState([])
  const [isShowCreateThingModal, setIsShowCreateThingModal] = useState(false)
  const [isShowEditThingStateModal, setIsShowEditStateModal] = useState(false)
  const [createModalThing, setCreateModalThing] = useState(null)
  const [confirmModelConfig, setConfirmModelConfig] = useState({})
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)
  const { showError, showNotification } = useNotification()

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
          }
          showNotification({
            type: 'success',
            title: 'Saved',
            message: 'Thing saved successfully',
          })
        })
      })
      .catch(error => {
        if (error?.queued) {
          showError({
            title: 'Unable to save thing',
            message: 'You are offline and the request has been queued',
          })
        } else {
          showError({
            title: 'Unable to save thing',
            message: 'An error occurred while saving the thing',
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
      title: 'Delete Things',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      message: 'Are you sure you want to delete this Thing?',
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
                  title: 'Unable to Delete Thing',
                  message: 'Unable to delete thing with associated tasks',
                })
              }
              // if method not allwo show snackbar:
            })
            .catch(error => {
              if (error?.queued) {
                showError({
                  title: 'Unable to delete thing',
                  message: 'You are offline and the request has been queued',
                })
              } else {
                showError({
                  title: 'Unable to delete thing',
                  message: 'An error occurred while deleting the thing',
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
            title: 'Updated',
            message: 'Thing state updated successfully',
          })
        })
      })
      .catch(error => {
        if (error?.queued) {
          showError({
            title: 'Unable to update thing state',
            message: 'You are offline and the request has been queued',
          })
        } else {
          showError({
            title: 'Unable to update thing state',
            message: 'An error occurred while updating the thing state',
          })
        }
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
            Things
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            Things are custom fields that can be attached to tasks to capture
            additional information. They can be of type text, number, or
            boolean. You can associate things with tasks and have the task due
            once condition is met
          </Typography>
        </Stack>
      </Box>
      <Box
        sx={{
          overflow: 'hidden',
        }}
      >
        {things.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              height: '50vh',
            }}
          >
            <Widgets
              sx={{
                fontSize: '4rem',
                mb: 1,
              }}
            />
            <Typography level='title-md' gutterBottom>
              No things has been created/found
            </Typography>
          </Box>
        )}
        <SwipeableList type={ListType.IOS} fullSwipe={false}>
          {things.map(thing => (
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
                          {thing?.type === 'text' ? 'Edit' : 'Toggle'}
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
                          Edit
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
                          Delete
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
            onSave={handleStateChangeRequest}
            currentThing={createModalThing}
          />
        )}

        <ConfirmationModal config={confirmModelConfig} />
      </Box>
    </Container>
  )
}

export default ThingsView
