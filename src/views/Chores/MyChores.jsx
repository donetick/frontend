import {
  Add,
  CancelRounded,
  EditCalendar,
  FilterAlt,
  PriorityHigh,
  Style,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Input,
  List,
  Menu,
  MenuItem,
  Snackbar,
  Typography,
} from '@mui/joy'
import Fuse from 'fuse.js'
import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../../contexts/UserContext'
import { useChores } from '../../queries/ChoreQueries'
import { GetAllUsers, GetUserProfile } from '../../utils/Fetcher'
import Priorities from '../../utils/Priorities'
import LoadingComponent from '../components/Loading'
import { useLabels } from '../Labels/LabelQueries'
import ChoreCard from './ChoreCard'
import IconButtonWithMenu from './IconButtonWithMenu'

const MyChores = () => {
  const { userProfile, setUserProfile } = useContext(UserContext)
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false)
  const [snackBarMessage, setSnackBarMessage] = useState(null)
  const [chores, setChores] = useState([])
  const [filteredChores, setFilteredChores] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeUserId, setActiveUserId] = useState(0)
  const [performers, setPerformers] = useState([])
  const [anchorEl, setAnchorEl] = useState(null)
  const menuRef = useRef(null)
  const Navigate = useNavigate()
  const { data: userLabels, isLoading: userLabelsLoading } = useLabels()
  const { data: choresData, isLoading: choresLoading } = useChores()
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

  useEffect(() => {
    if (userProfile === null) {
      GetUserProfile()
        .then(response => response.json())
        .then(data => {
          setUserProfile(data.res)
        })
    }

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
    if (choresData) {
      const sortedChores = choresData.res.sort(choreSorter)
      setChores(sortedChores)
      setFilteredChores(sortedChores)
    }
  }, [choresData, choresLoading])

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

  const handleLabelFiltering = chipClicked => {
    console.log('chipClicked', chipClicked)

    if (chipClicked.label) {
      const label = chipClicked.label
      const labelFiltered = [...chores].filter(chore =>
        chore.labelsV2.some(l => l.id === label.id),
      )
      console.log('labelFiltered', labelFiltered)
      setFilteredChores(labelFiltered)
      setSelectedFilter('Label: ' + label.name)
    } else if (chipClicked.priority) {
      const priority = chipClicked.priority
      const priorityFiltered = chores.filter(
        chore => chore.priority === priority,
      )
      setFilteredChores(priorityFiltered)
      setSelectedFilter('Priority: ' + priority)
    }
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

  const searchOptions = {
    // keys to search in
    keys: ['name', 'raw_label'],
    includeScore: true, // Optional: if you want to see how well each result matched the search term
    isCaseSensitive: false,
    findAllMatches: true,
  }

  const fuse = new Fuse(
    chores.map(c => ({
      ...c,
      raw_label: c.labelsV2
        .map(l => userLabels.find(x => x.id === l.id).name)
        .join(' '),
    })),
    searchOptions,
  )

  const handleSearchChange = e => {
    if (selectedFilter !== 'All') {
      setSelectedFilter('All')
    }
    const search = e.target.value
    if (search === '') {
      setFilteredChores(chores)
      setSearchTerm('')
      return
    }

    const term = search.toLowerCase()
    setSearchTerm(term)
    setFilteredChores(fuse.search(term).map(result => result.item))
  }

  if (
    userProfile === null ||
    userLabelsLoading ||
    performers.length === 0 ||
    choresLoading
  ) {
    return <LoadingComponent />
  }

  return (
    <Container maxWidth='md'>
      {/* <Typography level='h3' mb={1.5}>
        My Chores
      </Typography> */}
      {/* <Sheet> */}
      {/* Search box to filter  */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignContent: 'center',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <Input
          placeholder='Search'
          value={searchTerm}
          fullWidth
          sx={{
            mt: 1,
            mb: 1,
            borderRadius: 24,
            // border: '1px solid',
            height: 24,
            borderColor: 'text.disabled',
            padding: 1,
          }}
          onChange={handleSearchChange}
          endDecorator={
            searchTerm && (
              <CancelRounded
                onClick={() => {
                  setSearchTerm('')
                  setFilteredChores(chores)
                }}
              />
            )
          }
        />
        <IconButtonWithMenu
          key={'icon-menu-labels-filter'}
          icon={<PriorityHigh />}
          options={Priorities}
          selectedItem={selectedFilter}
          onItemSelect={selected => {
            handleLabelFiltering({ priority: selected.value })
          }}
          mouseClickHandler={handleMenuOutsideClick}
          isActive={selectedFilter.startsWith('Priority: ')}
        />
        <IconButtonWithMenu
          key={'icon-menu-labels-filter'}
          icon={<Style />}
          options={userLabels}
          selectedItem={selectedFilter}
          onItemSelect={selected => {
            handleLabelFiltering({ label: selected })
          }}
          isActive={selectedFilter.startsWith('Label: ')}
          mouseClickHandler={handleMenuOutsideClick}
          useChips
        />

        <IconButton
          onClick={handleFilterMenuOpen}
          variant='outlined'
          color={
            selectedFilter && FILTERS[selectedFilter] && selectedFilter != 'All'
              ? 'primary'
              : 'neutral'
          }
          size='sm'
          sx={{
            height: 24,
            borderRadius: 24,
          }}
        >
          <FilterAlt />
        </IconButton>
        <List
          orientation='horizontal'
          wrap
          sx={{
            mt: 0.2,
          }}
        >
          <Menu
            ref={menuRef}
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleFilterMenuClose}
          >
            {Object.keys(FILTERS).map((filter, index) => (
              <MenuItem
                key={`filter-list-${filter}-${index}`}
                onClick={() => {
                  const filterFunction = FILTERS[filter]
                  const filteredChores =
                    filterFunction.length === 2
                      ? filterFunction(chores, userProfile.id)
                      : filterFunction(chores)
                  setFilteredChores(filteredChores)
                  setSelectedFilter(filter)
                  handleFilterMenuClose()
                }}
              >
                {filter}
                <Chip color={selectedFilter === filter ? 'primary' : 'neutral'}>
                  {FILTERS[filter].length === 2
                    ? FILTERS[filter](chores, userProfile.id).length
                    : FILTERS[filter](chores).length}
                </Chip>
              </MenuItem>
            ))}
            {selectedFilter.startsWith('Label: ') ||
              (selectedFilter.startsWith('Priority: ') && (
                <MenuItem
                  key={`filter-list-cancel-all-filters`}
                  onClick={() => {
                    setFilteredChores(chores)
                    setSelectedFilter('All')
                  }}
                >
                  Cancel All Filters
                </MenuItem>
              ))}
          </Menu>
        </List>
      </Box>
      {selectedFilter !== 'All' && (
        <Chip
          level='title-md'
          gutterBottom
          color='warning'
          label={selectedFilter}
          onDelete={() => {
            setFilteredChores(chores)
            setSelectedFilter('All')
          }}
          endDecorator={<CancelRounded />}
          onClick={() => {
            setFilteredChores(chores)
            setSelectedFilter('All')
          }}
        >
          Current Filter: {selectedFilter}
        </Chip>
      )}
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
          {chores.length > 0 && (
            <>
              <Button
                onClick={() => setFilteredChores(chores)}
                variant='outlined'
                color='neutral'
              >
                Reset filters
              </Button>
            </>
          )}
        </Box>
      )}

      {filteredChores.map(chore => (
        <ChoreCard
          key={chore.id}
          chore={chore}
          onChoreUpdate={handleChoreUpdated}
          onChoreRemove={handleChoreDeleted}
          performers={performers}
          userLabels={userLabels}
          onChipClick={handleLabelFiltering}
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
  'Due Later': function (chores) {
    return chores.filter(chore => {
      return (
        new Date(chore.nextDueDate) > new Date(Date.now() + 24 * 60 * 60 * 1000)
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
