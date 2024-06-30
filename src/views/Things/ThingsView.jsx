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
  Card,
  Chip,
  Container,
  Grid,
  IconButton,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import {
  CreateThing,
  DeleteThing,
  GetThings,
  SaveThing,
  UpdateThingState,
} from '../../utils/Fetcher'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import CreateThingModal from '../Modals/Inputs/CreateThingModal'

const ThingCard = ({
  thing,
  onEditClick,
  onStateChangeRequest,
  onDeleteClick,
}) => {
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
  return (
    <Card
      variant='outlined'
      sx={{
        // display: 'flex',
        // flexDirection: 'row', // Change to 'row'
        justifyContent: 'space-between',
        p: 2,
        backgroundColor: 'white',
        boxShadow: 'sm',
        borderRadius: 8,
        mb: 1,
      }}
    >
      <Grid container>
        <Grid item xs={9}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: 1,
            }}
          >
            <Typography level='title-lg' component='h2'>
              {thing?.name}
            </Typography>
            <Chip level='body-md' component='p'>
              {thing?.type}
            </Chip>
          </Box>
          <Box>
            <Typography level='body-sm' component='p'>
              Current state:
              <Chip level='title-md' component='span' size='sm'>
                {thing?.state}
              </Chip>
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box display='flex' justifyContent='flex-end' alignItems='flex-end'>
            {/* <ButtonGroup> */}
            <IconButton
              variant='solid'
              color='success'
              onClick={() => {
                onStateChangeRequest(thing)
              }}
              sx={{
                borderRadius: '50%',
                width: 50,
                height: 50,
                zIndex: 1,
              }}
            >
              {getThingIcon(thing?.type)}
            </IconButton>
            <IconButton
              // sx={{ width: 15 }}
              variant='soft'
              color='success'
              onClick={() => {
                onEditClick(thing)
              }}
              sx={{
                borderRadius: '50%',
                width: 25,
                height: 25,
                position: 'relative',
                left: -10,
              }}
            >
              <Edit />
            </IconButton>
            {/* add delete icon: */}
            <IconButton
              // sx={{ width: 15 }}

              color='danger'
              variant='soft'
              onClick={() => {
                onDeleteClick(thing)
              }}
              sx={{
                borderRadius: '50%',
                width: 25,
                height: 25,
                position: 'relative',
                left: -10,
              }}
            >
              <Delete />
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
  const [createModalThing, setCreateModalThing] = useState(null)
  const [confirmModelConfig, setConfirmModelConfig] = useState({})
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
  }
  const handleEditClick = thing => {
    setCreateModalThing(thing)
    setIsShowCreateThingModal(true)
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
            }
          })
        }
        setConfirmModelConfig({})
      },
    })
  }

  const handleStateChangeRequest = thing => {
    if (thing?.type === 'text') {
      setCreateModalThing(thing)
      setIsShowCreateThingModal(true)
    } else {
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
    }
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
        <ConfirmationModal config={confirmModelConfig} />
      </Box>
    </Container>
  )
}

export default ThingsView
