import { Add, EditCalendar } from '@mui/icons-material'
import {
  Badge,
  Box,
  Checkbox,
  CircularProgress,
  Container,
  IconButton,
  List,
  ListItem,
  Menu,
  MenuItem,
  Snackbar,
  Typography,
} from '@mui/joy'
import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../../contexts/UserContext'
import Logo from '../../Logo'
import { GetAllUsers, GetChores, GetUserProfile } from '../../utils/Fetcher'
import ChoreCard from './ChoreCard'

const MyChores = () => {
  const { userProfile, setUserProfile } = useContext(UserContext)
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false)
  const [snackBarMessage, setSnackBarMessage] = useState(null)
  const [chores, setChores] = useState([])
  const [filteredChores, setFilteredChores] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [activeUserId, setActiveUserId] = useState(0)
  const [performers, setPerformers] = useState([])
  const [anchorEl, setAnchorEl] = useState(null)
  const menuRef = useRef(null)
  const Navigate = useNavigate()
  const choreSorter = (a, b) => {
    // 1. Handle null due dates (always last):
    if (!a.nextDueDate && !b.nextDueDate) return 0 // Both null, no order
    if (!a.nextDueDate) return 1 // a is null, comes later
    if (!b.nextDueDate) return -1 // b is null, comes earlier

    const aDueDate = new Date(a.nextDueDate)
    const bDueDate = new Date(b.nextDueDate)
    const now = new Date()

    const oneDayInMs = 24 * 60 * 60 * 1000

    // 2. Prioritize tasks due today +- 1 day:
    const aTodayOrNear = Math.abs(aDueDate - now) <= oneDayInMs
    const bTodayOrNear = Math.abs(bDueDate - now) <= oneDayInMs
    if (aTodayOrNear && !bTodayOrNear) return -1 // a is closer
    if (!aTodayOrNear && bTodayOrNear) return 1 // b is closer

    // 3. Handle overdue tasks (excluding today +- 1):
    const aOverdue = aDueDate < now && !aTodayOrNear
    const bOverdue = bDueDate < now && !bTodayOrNear
    if (aOverdue && !bOverdue) return -1 // a is overdue, comes earlier
    if (!aOverdue && bOverdue) return 1 // b is overdue, comes earlier

    // 4. Sort future tasks by due date:
    return aDueDate - bDueDate // Sort ascending by due date
  }

  const handleSelectedFilter = selected => {
    setFilteredChores(FILTERS[selected](chores))

    setSelectedFilter(selected)
  }

  useEffect(() => {
    if (userProfile === null) {
      GetUserProfile()
        .then(response => response.json())
        .then(data => {
          setUserProfile(data.res)
        })
    }
    GetChores()
      .then(response => response.json())
      .then(data => {
        data.res.sort(choreSorter)
        setChores(data.res)

        setFilteredChores(data.res)
      })

    GetAllUsers()
      .then(response => response.json())
      .then(data => {
        setPerformers(data.res)
      })

    const currentUser = JSON.parse(localStorage.getItem('user'))
    if (currentUser !== null) {
      setActiveUserId(currentUser.id)
    }
  }, [])
  useEffect(() => {
    document.addEventListener('mousedown', handleMenuOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [anchorEl])
  const handleMenuOutsideClick = event => {
    if (
      anchorEl &&
      !anchorEl.contains(event.target) &&
      !menuRef.current.contains(event.target)
    ) {
      handleFilterMenuClose()
    }
  }
  const handleFilterMenuOpen = event => {
    event.preventDefault()
    setAnchorEl(event.currentTarget)
  }

  const handleFilterMenuClose = () => {
    setAnchorEl(null)
  }
  const handleChoreUpdated = (updatedChore, event) => {
    const newChores = chores.map(chore => {
      if (chore.id === updatedChore.id) {
        return updatedChore
      }
      return chore
    })

    const newFilteredChores = filteredChores.map(chore => {
      if (chore.id === updatedChore.id) {
        return updatedChore
      }
      return chore
    })
    setChores(newChores)
    setFilteredChores(newFilteredChores)
    switch (event) {
      case 'completed':
        setSnackBarMessage('Completed')
        break
      case 'skipped':
        setSnackBarMessage('Skipped')
        break
      case 'rescheduled':
        setSnackBarMessage('Rescheduled')
        break
      default:
        setSnackBarMessage('Updated')
    }
    setIsSnackbarOpen(true)
  }

  const handleChoreDeleted = deletedChore => {
    const newChores = chores.filter(chore => chore.id !== deletedChore.id)
    const newFilteredChores = filteredChores.filter(
      chore => chore.id !== deletedChore.id,
    )
    setChores(newChores)
    setFilteredChores(newFilteredChores)
  }

  if (userProfile === null) {
    return (
      <Container className='flex h-full items-center justify-center'>
        <Box className='flex flex-col items-center justify-center'>
          <CircularProgress
            color='success'
            sx={{ '--CircularProgress-size': '200px' }}
          >
            <Logo />
          </CircularProgress>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth='md'>
      {/* <Typography level='h3' mb={1.5}>
        My Chores
      </Typography> */}
      {/* <Sheet> */}
      <List
        orientation='horizontal'
        wrap
        sx={{
          '--List-gap': '8px',
          '--ListItem-radius': '20px',
          '--ListItem-minHeight': '32px',
          '--ListItem-gap': '4px',
          mt: 0.2,
        }}
      >
        {['All', 'Overdue', 'Due today', 'Due in week'].map(filter => (
          <Badge
            key={filter}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            variant='outlined'
            color={selectedFilter === filter ? 'primary' : 'neutral'}
            badgeContent={FILTERS[filter](chores).length}
            badgeInset={'5px'}
          >
            <ListItem key={filter}>
              <Checkbox
                key={'checkbox' + filter}
                label={filter}
                onClick={() => handleSelectedFilter(filter)}
                checked={filter === selectedFilter}
                disableIcon
                overlay
                size='sm'
              />
            </ListItem>
          </Badge>
        ))}

        <ListItem onClick={handleFilterMenuOpen}>
          <Checkbox key='checkboxAll' label='⋮' disableIcon overlay size='lg' />
        </ListItem>
        <Menu
          ref={menuRef}
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleFilterMenuClose}
        >
          <MenuItem
            onClick={() => {
              setFilteredChores(
                FILTERS['Assigned To Me'](chores, userProfile.id),
              )
              setSelectedFilter('Assigned To Me')
              handleFilterMenuClose()
            }}
          >
            Assigned to me
          </MenuItem>
          <MenuItem
            onClick={() => {
              setFilteredChores(
                FILTERS['Created By Me'](chores, userProfile.id),
              )
              setSelectedFilter('Created By Me')
              handleFilterMenuClose()
            }}
          >
            Created by me
          </MenuItem>
          <MenuItem
            onClick={() => {
              setFilteredChores(FILTERS['No Due Date'](chores, userProfile.id))
              setSelectedFilter('No Due Date')
              handleFilterMenuClose()
            }}
          >
            No Due Date
          </MenuItem>
        </Menu>
      </List>
      {/* </Sheet> */}
      {filteredChores.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            height: '50vh',
          }}
        >
          <EditCalendar
            sx={{
              fontSize: '4rem',
              // color: 'text.disabled',
              mb: 1,
            }}
          />
          <Typography level='title-md' gutterBottom>
            Nothing scheduled
          </Typography>
        </Box>
      )}

      {filteredChores.map(chore => (
        <ChoreCard
          key={chore.id}
          chore={chore}
          onChoreUpdate={handleChoreUpdated}
          onChoreRemove={handleChoreDeleted}
          performers={performers}
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
            Navigate(`/chores/create`)
          }}
        >
          <Add />
        </IconButton>
      </Box>
      <Snackbar
        open={isSnackbarOpen}
        onClose={() => {
          setIsSnackbarOpen(false)
        }}
        autoHideDuration={3000}
        variant='soft'
        color='success'
        size='lg'
        invertedColors
      >
        <Typography level='title-md'>{snackBarMessage}</Typography>
      </Snackbar>
    </Container>
  )
}

const FILTERS = {
  All: function (chores) {
    return chores
  },
  Overdue: function (chores) {
    return chores.filter(chore => {
      if (chore.nextDueDate === null) return false
      return new Date(chore.nextDueDate) < new Date()
    })
  },
  'Due today': function (chores) {
    return chores.filter(chore => {
      return (
        new Date(chore.nextDueDate).toDateString() === new Date().toDateString()
      )
    })
  },
  'Due in week': function (chores) {
    return chores.filter(chore => {
      return (
        new Date(chore.nextDueDate) <
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
        new Date(chore.nextDueDate) > new Date()
      )
    })
  },
  'Created By Me': function (chores, userID) {
    return chores.filter(chore => {
      return chore.createdBy === userID
    })
  },
  'Assigned To Me': function (chores, userID) {
    return chores.filter(chore => {
      return chore.assignedTo === userID
    })
  },
  'No Due Date': function (chores, userID) {
    return chores.filter(chore => {
      return chore.nextDueDate === null
    })
  },
}

export default MyChores
