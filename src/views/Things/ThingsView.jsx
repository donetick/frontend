import {
  Add,
  Delete,
  Edit,
  Flip,
  PlusOne,
  ToggleOff,
  ToggleOn,
  Widgets,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  Snackbar,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

  const handleRequestChange = thing => {
    setIsDisabled(true)
    onStateChangeRequest(thing)
    setTimeout(() => {
      setIsDisabled(false)
    }, 2000)
  }

  return (
    <Box
      className='rounded-lg border border-zinc-200/80 p-4 shadow-sm'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 2,

        mb: 2,
      }}
    >
      <Grid container alignItems='center'>
        <Grid
          item
          xs={12}
          sm={8}
          onClick={() => Navigate(`/things/${thing?.id}`)}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
            }}
            onClick={() => Navigate(`/things/${thing?.id}`)}
          >
            <Typography level='title-lg'>{thing?.name}</Typography>
            <Chip
              size='sm'
              sx={{
                ml: 1,
              }}
            >
              {thing?.type}
            </Chip>
          </Box>
          State: <Chip size='md'>{thing?.state}</Chip>
        </Grid>
        <Grid
          item
          xs={12}
          sm={4}
          container
          justifyContent='flex-end'
          alignItems='center'
        >
          <Button
            variant='soft'
            color='success'
            onClick={() => {
              if (thing?.type === 'text') {
                onEditClick(thing)
              } else {
                handleRequestChange(thing)
              }
            }}
            disabled={isDisabled}
            startDecorator={getThingIcon(thing?.type)}
          >
            {thing?.type === 'text'
              ? 'Change'
              : thing?.type === 'number'
                ? 'Increment'
                : 'Toggle'}
          </Button>
          <IconButton
            color='primary'
            onClick={() => onEditClick(thing)}
            sx={{
              borderRadius: '50%',
              width: 30,
              height: 30,
              ml: 1,
              transition: 'background-color 0.2s',
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          >
            <Edit />
          </IconButton>
          <IconButton
            color='danger'
            onClick={() => onDeleteClick(thing)}
            sx={{
              borderRadius: '50%',
              width: 30,
              height: 30,
              ml: 1,
            }}
          >
            <Delete fontSize='small' />
          </IconButton>
        </Grid>
      </Grid>
    </Box>
  )
}

const ThingsView = () => {
  const [things, setThings] = useState([])
  const [isShowCreateThingModal, setIsShowCreateThingModal] = useState(false)
  const [isShowEditThingStateModal, setIsShowEditStateModal] = useState(false)
  const [createModalThing, setCreateModalThing] = useState(null)
  const [confirmModelConfig, setConfirmModelConfig] = useState({})

  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarColor, setSnackbarColor] = useState('success')

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
    saveFunc(thing).then(result => {
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
      })
    })
    setSnackbarMessage('Thing saved successfully')
    setSnackbarColor('success')
    setIsSnackbarOpen(true)
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
          DeleteThing(thing.id).then(response => {
            if (response.ok) {
              const currentThings = [...things]
              const thingIndex = currentThings.findIndex(
                currentThing => currentThing.id === thing.id,
              )
              currentThings.splice(thingIndex, 1)
              setThings(currentThings)
            } else if (response.status === 405) {
              setSnackbarMessage('Unable to delete thing with associated tasks')
              setSnackbarColor('danger')
              setIsSnackbarOpen(true)
            }
            // if method not allwo show snackbar:
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

    UpdateThingState(thing).then(result => {
      result.json().then(data => {
        const currentThings = [...things]
        const thingIndex = currentThings.findIndex(
          currentThing => currentThing.id === thing.id,
        )
        currentThings[thingIndex] = data.res
        setThings(currentThings)
      })
    })

    setSnackbarMessage('Thing state updated successfully')
    setIsSnackbarOpen(true)
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
      <Snackbar
        open={isSnackbarOpen}
        onClose={() => {
          setIsSnackbarOpen(false)
        }}
        autoHideDuration={3000}
        variant='soft'
        color={snackbarColor}
        size='lg'
        invertedColors
      >
        <Typography level='title-md'>{snackbarMessage}</Typography>
      </Snackbar>
    </Container>
  )
}

export default ThingsView
