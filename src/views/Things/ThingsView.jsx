import {
  Add,
  Delete,
  Edit,
  Flip,
  PlusOne,
  ToggleOff,
  ToggleOn,
  TrendingUp,
  Widgets,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Grid,
  IconButton,
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
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import CreateThingModal from '../Modals/Inputs/CreateThingModal'
import EditThingStateModal from '../Modals/Inputs/EditThingState'
const ThingCard = ({
  thing,
  onEditClick,
  onStateChangeRequest,
  onDeleteClick,
}) => {
  const [isDisabled, setIsDisabled] = useState(false)
  const Navigate = useNavigate()

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
        icon: thing.state === 'true' ? <ToggleOn /> : <ToggleOff /> 
      },
    }

    const config = typeConfig[thing?.type] || typeConfig.boolean
    return (
      <Avatar
        size='sm'
        color={config.color}
        variant='solid'
        sx={{
          width: 28,
          height: 28,
          '& svg': { fontSize: '16px' },
        }}
      >
        {config.icon}
      </Avatar>
    )
  }

  const getActionButtonProps = () => {
    const buttonConfig = {
      text: { text: 'Change', color: 'primary' },
      number: { text: 'Increment', color: 'success' },
      boolean: { text: 'Toggle', color: 'warning' },
    }
    
    return buttonConfig[thing?.type] || buttonConfig.boolean
  }

  const handleRequestChange = thing => {
    setIsDisabled(true)
    onStateChangeRequest(thing)
    setTimeout(() => {
      setIsDisabled(false)
    }, 2000)
  }

  const actionProps = getActionButtonProps()

  return (
    <Card
      variant='outlined'
      sx={{
        mb: 2,
        p: 2,
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        '&:hover': {
          borderColor: 'primary.300',
          boxShadow: 'sm',
          transform: 'translateY(-1px)',
        },
      }}
      onClick={() => Navigate(`/things/${thing?.id}`)}
    >
      <Grid container spacing={2} alignItems='center'>
        {/* First Row: Thing Info */}
        <Grid xs={12} sm={8}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 1,
            }}
          >
            {getThingAvatar()}
            
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                level='title-md'
                sx={{ 
                  fontWeight: 'lg',
                  color: 'text.primary',
                  mb: 0.5,
                }}
              >
                {thing?.name}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  size='sm'
                  variant='soft'
                  color='neutral'
                >
                  {thing?.type}
                </Chip>
                
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                  •
                </Typography>
                
                <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                  Current state:
                </Typography>
                
                <Chip
                  size='sm'
                  variant='solid'
                  color={thing?.type === 'boolean' && thing?.state === 'true' ? 'success' : 'primary'}
                  sx={{ fontWeight: 'md' }}
                >
                  {thing?.state}
                </Chip>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* Second Row: Action Buttons */}
        <Grid xs={12} sm={4}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              alignItems: 'center',
              gap: 1,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant='solid'
              color={actionProps.color}
              size='sm'
              onClick={() => {
                if (thing?.type === 'text') {
                  onEditClick(thing)
                } else {
                  handleRequestChange(thing)
                }
              }}
              disabled={isDisabled}
              startDecorator={getThingIcon(thing?.type)}
              sx={{ 
                minWidth: '80px',
                fontWeight: 'md',
              }}
            >
              {actionProps.text}
            </Button>

            <IconButton
              variant='outlined'
              color='neutral'
              size='sm'
              onClick={(e) => {
                e.stopPropagation()
                onEditClick(thing)
              }}
              sx={{
                borderRadius: '50%',
                width: 32,
                height: 32,
                transition: 'all 0.2s',
                '&:hover': { 
                  backgroundColor: 'primary.softBg',
                  borderColor: 'primary.300',
                },
              }}
            >
              <Edit fontSize='small' />
            </IconButton>

            <IconButton
              variant='outlined'
              color='danger'
              size='sm'
              onClick={(e) => {
                e.stopPropagation()
                onDeleteClick(thing)
              }}
              sx={{
                borderRadius: '50%',
                width: 32,
                height: 32,
                transition: 'all 0.2s',
                '&:hover': { 
                  backgroundColor: 'danger.softBg',
                  borderColor: 'danger.300',
                },
              }}
            >
              <Delete fontSize='small' />
            </IconButton>
          </Box>
        </Grid>
      </Grid>
    </Card>
  )
}

const ThingsView = () => {
  const [things, setThings] = useState([])
  const [isShowCreateThingModal, setIsShowCreateThingModal] = useState(false)
  const [isShowEditThingStateModal, setIsShowEditStateModal] = useState(false)
  const [createModalThing, setCreateModalThing] = useState(null)
  const [confirmModelConfig, setConfirmModelConfig] = useState({})
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
    if (thing?.type === 'number') {
      thing.state = Number(thing.state) + 1
    } else if (thing?.type === 'boolean') {
      if (thing.state === 'true') {
        thing.state = 'false'
      } else {
        thing.state = 'true'
      }
    }

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
    <Container maxWidth='md'>
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
              // color: 'text.disabled',
              mb: 1,
            }}
          />
          <Typography level='title-md' gutterBottom>
            No things has been created/found
          </Typography>
        </Box>
      )}
      {things.map(thing => (
        <ThingCard
          key={thing?.id}
          thing={thing}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          onStateChangeRequest={handleStateChangeRequest}
        />
      ))}
      <Box
        // variant='outlined'
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 10,
          p: 2, // padding
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
