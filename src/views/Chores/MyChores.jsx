import {
  Add,
  CancelRounded,
  EditCalendar,
  ExpandCircleDown,
  FilterAlt,
  PriorityHigh,
  Search,
  Sort,
  Style,
  Unarchive,
} from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  Box,
  Button,
  Chip,
  Container,
  Divider,
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
import {
  GetAllUsers,
  GetArchivedChores,
  GetChores,
  GetUserProfile,
} from '../../utils/Fetcher'
import Priorities from '../../utils/Priorities'
import LoadingComponent from '../components/Loading'
import { useLabels } from '../Labels/LabelQueries'
import ChoreCard from './ChoreCard'
import IconButtonWithMenu from './IconButtonWithMenu'

import { ChoresGrouper } from '../../utils/Chores'
import TaskInput from '../components/AddTaskModal'
import {
  canScheduleNotification,
  scheduleChoreNotification,
} from './LocalNotificationScheduler'
import NotificationAccessSnackbar from './NotificationAccessSnackbar'
import Sidepanel from './Sidepanel'

const MyChores = () => {
  const { userProfile, setUserProfile } = useContext(UserContext)
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false)
  const [snackBarMessage, setSnackBarMessage] = useState(null)
  const [chores, setChores] = useState([])
  const [archivedChores, setArchivedChores] = useState(null)
  const [filteredChores, setFilteredChores] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [choreSections, setChoreSections] = useState([])
  const [activeTextField, setActiveTextField] = useState('task')
  const [taskInputFocus, setTaskInputFocus] = useState(0)
  const searchInputRef = useRef()
  const [searchInputFocus, setSearchInputFocus] = useState(0)
  const [selectedChoreSection, setSelectedChoreSection] = useState('due_date')
  const [openChoreSections, setOpenChoreSections] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
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
    Promise.all([GetChores(), GetAllUsers(), GetUserProfile()]).then(
      responses => {
        const [choresResponse, usersResponse, userProfileResponse] = responses
        if (!choresResponse.ok) {
          throw new Error(choresResponse.statusText)
        }
        if (!usersResponse.ok) {
          throw new Error(usersResponse.statusText)
        }
        if (!userProfileResponse.ok) {
          throw new Error(userProfileResponse.statusText)
        }
        Promise.all([
          choresResponse.json(),
          usersResponse.json(),
          userProfileResponse.json(),
        ]).then(data => {
          const [choresData, usersData, userProfileData] = data
          setUserProfile(userProfileData.res)
          choresData.res.sort(choreSorter)
          setChores(choresData.res)
          setFilteredChores(choresData.res)
          setPerformers(usersData.res)
          if (canScheduleNotification()) {
            scheduleChoreNotification(
              choresData.res,
              userProfileData.res,
              usersData.res,
            )
          }
        })
      },
    )

    // GetAllUsers()
    //   .then(response => response.json())
    //   .then(data => {
    //     setPerformers(data.res)
    //   })
    // GetUserProfile().then(response => response.json()).then(data => {
    //   setUserProfile(data.res)
    // })

    // const currentUser = JSON.parse(localStorage.getItem('user'))
    // if (currentUser !== null) {
    //   setActiveUserId(currentUser.id)
    // }
  }, [])

  useEffect(() => {
    if (choresData) {
      const sortedChores = choresData.res.sort(choreSorter)
      setChores(sortedChores)
      setFilteredChores(sortedChores)
      const sections = ChoresGrouper('due_date', sortedChores)
      setChoreSections(sections)
      setOpenChoreSections(
        Object.keys(sections).reduce((acc, key) => {
          acc[key] = true
          return acc
        }, {}),
      )
    }
  }, [choresData, choresLoading])

  useEffect(() => {
    document.addEventListener('mousedown', handleMenuOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [anchorEl])

  useEffect(() => {
    if (searchInputFocus > 0 && searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.selectionStart =
        searchInputRef.current.value?.length
      searchInputRef.current.selectionEnd = searchInputRef.current.value?.length
    }
  }, [searchInputFocus])
  const updateChores = newChore => {
    const newChores = chores
    newChores.push(newChore)
    setChores(newChores)
    setFilteredChores(newChores)
    setChoreSections(ChoresGrouper('due_date', newChores))
    setSelectedFilter('All')
  }
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
    if (chipClicked.label) {
      const label = chipClicked.label
      const labelFiltered = [...chores].filter(chore =>
        chore.labelsV2.some(
          l => l.id === label.id && l.created_by === label.created_by,
        ),
      )
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
    var newChores = chores.map(chore => {
      if (chore.id === updatedChore.id) {
        return updatedChore
      }
      return chore
    })

    var newFilteredChores = filteredChores.map(chore => {
      if (chore.id === updatedChore.id) {
        return updatedChore
      }
      return chore
    })
    if (event === 'archive') {
      newChores = newChores.filter(chore => chore.id !== updatedChore.id)
      newFilteredChores = newFilteredChores.filter(
        chore => chore.id !== updatedChore.id,
      )
      if (archivedChores !== null) {
        setArchivedChores([...archivedChores, updatedChore])
      }
    }
    if (event === 'unarchive') {
      newChores.push(updatedChore)
      newFilteredChores.push(updatedChore)
      setArchivedChores(
        archivedChores.filter(chore => chore.id !== updatedChore.id),
      )
    }
    setChores(newChores)
    setFilteredChores(newFilteredChores)
    setChoreSections(ChoresGrouper('due_date', newChores))

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
      case 'unarchive':
        setSnackBarMessage('Unarchive')
        break
      case 'archive':
        setSnackBarMessage('Archived')
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
    setChoreSections(ChoresGrouper('due_date', newChores))
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
      raw_label: c.labelsV2.map(c => c.name).join(' '),
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <Container maxWidth='md'>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignContent: 'center',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {activeTextField == 'task' && (
            <TaskInput
              autoFocus={taskInputFocus}
              onChoreUpdate={updateChores}
            />
          )}

          {activeTextField == 'search' && (
            <Input
              ref={searchInputRef}
              autoFocus={searchInputFocus > 0}
              placeholder='Search'
              value={searchTerm}
              fullWidth
              sx={{
                mt: 1,
                mb: 1,
                borderRadius: 24,
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
          )}
          {activeTextField != 'task' && (
            <Button
              variant='outlined'
              size='sm'
              color='neutral'
              sx={{
                height: 24,
                borderRadius: 24,
                minWidth: 100,
              }}
              startDecorator={<EditCalendar />}
              onClick={() => {
                setActiveTextField('task')
                setTaskInputFocus(taskInputFocus + 1)
              }}
            >
              Task
            </Button>
          )}
          {activeTextField != 'search' && (
            <Button
              variant='outlined'
              color='neutral'
              size='sm'
              sx={{
                height: 24,
                borderRadius: 24,
              }}
              startDecorator={<Search />}
              onClick={() => {
                setActiveTextField('search')
                setSearchInputFocus(searchInputFocus + 1)

                searchInputRef.current.focus()
                searchInputRef.current.selectionStart =
                  searchInputRef.current.value?.length
                searchInputRef.current.selectionEnd =
                  searchInputRef.current.value?.length
              }}
            >
              Search
            </Button>
          )}
          <Divider orientation='vertical' />
          <IconButtonWithMenu
            icon={<PriorityHigh />}
            title='Filter by Priority'
            options={Priorities}
            selectedItem={selectedFilter}
            onItemSelect={selected => {
              handleLabelFiltering({ priority: selected.value })
            }}
            mouseClickHandler={handleMenuOutsideClick}
            isActive={selectedFilter.startsWith('Priority: ')}
          />
          <IconButtonWithMenu
            icon={<Style />}
            // TODO : this need simplification we want to display both user labels and chore labels
            // that why we are merging them here.
            // we also filter out the labels that user created as those will be part of user labels
            title='Filter by Label'
            options={[
              ...userLabels,
              ...chores
                .map(c => c.labelsV2)
                .flat()
                .filter(l => l.created_by !== userProfile.id)
                .map(l => {
                  //  if user created it don't show it:
                  return {
                    ...l,
                    name: l.name + ' (Shared Label)',
                  }
                }),
            ]}
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
              selectedFilter &&
              FILTERS[selectedFilter] &&
              selectedFilter != 'All'
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
                  <Chip
                    color={selectedFilter === filter ? 'primary' : 'neutral'}
                  >
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
          <Divider orientation='vertical' />
          <IconButtonWithMenu
            title='Group by'
            icon={<Sort />}
            options={[
              { name: 'Due Date', value: 'due_date' },
              { name: 'Priority', value: 'priority' },
              { name: 'Labels', value: 'labels' },
            ]}
            selectedItem={selectedChoreSection}
            onItemSelect={selected => {
              const section = ChoresGrouper(selected.value, chores)
              setChoreSections(section)
              setSelectedChoreSection(selected.value)
              setFilteredChores(chores)
              setSelectedFilter('All')
            }}
            mouseClickHandler={handleMenuOutsideClick}
          />
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
                  onClick={() => {
                    setFilteredChores(chores)
                    setSearchTerm('')
                  }}
                  variant='outlined'
                  color='neutral'
                >
                  Reset filters
                </Button>
              </>
            )}
          </Box>
        )}
        {(searchTerm?.length > 0 || selectedFilter !== 'All') &&
          filteredChores.map(chore => (
            <ChoreCard
              key={`filtered-${chore.id} `}
              chore={chore}
              onChoreUpdate={handleChoreUpdated}
              onChoreRemove={handleChoreDeleted}
              performers={performers}
              userLabels={userLabels}
              onChipClick={handleLabelFiltering}
            />
          ))}
        {searchTerm.length === 0 && selectedFilter === 'All' && (
          <AccordionGroup transition='0.2s ease' disableDivider>
            {choreSections.map((section, index) => {
              if (section.content.length === 0) return null
              return (
                <Accordion
                  title={section.name}
                  key={section.name + index}
                  sx={{
                    my: 0,
                  }}
                  expanded={Boolean(openChoreSections[index])}
                >
                  <Divider orientation='horizontal'>
                    <Chip
                      variant='soft'
                      color='neutral'
                      size='md'
                      onClick={() => {
                        if (openChoreSections[index]) {
                          const newOpenChoreSections = {
                            ...openChoreSections,
                          }
                          delete newOpenChoreSections[index]
                          setOpenChoreSections(newOpenChoreSections)
                        } else {
                          setOpenChoreSections({
                            ...openChoreSections,
                            [index]: true,
                          })
                        }
                      }}
                      endDecorator={
                        openChoreSections[index] ? (
                          <ExpandCircleDown
                            color='primary'
                            sx={{ transform: 'rotate(180deg)' }}
                          />
                        ) : (
                          <ExpandCircleDown color='primary' />
                        )
                      }
                      startDecorator={
                        <>
                          <Chip color='primary' size='sm' variant='soft'>
                            {section?.content?.length}
                          </Chip>
                        </>
                      }
                    >
                      {section.name}
                    </Chip>
                  </Divider>
                  <AccordionDetails
                    sx={{
                      flexDirection: 'column',
                      my: 0,
                    }}
                  >
                    {section.content?.map(chore => (
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
                  </AccordionDetails>
                </Accordion>
              )
            })}
          </AccordionGroup>
        )}
        <Box
          sx={{
            // center the button
            justifyContent: 'center',
            mt: 2,
          }}
        >
          {archivedChores === null && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                sx={{}}
                onClick={() => {
                  GetArchivedChores()
                    .then(response => response.json())
                    .then(data => {
                      setArchivedChores(data.res)
                    })
                }}
                variant='outlined'
                color='neutral'
                startDecorator={<Unarchive />}
              >
                Show Archived
              </Button>
            </Box>
          )}
          {archivedChores !== null && (
            <>
              <Divider orientation='horizontal'>
                <Chip
                  variant='soft'
                  color='danger'
                  size='md'
                  startDecorator={
                    <>
                      <Chip color='danger' size='sm' variant='plain'>
                        {archivedChores?.length}
                      </Chip>
                    </>
                  }
                >
                  Archived
                </Chip>
              </Divider>

              {archivedChores?.map(chore => (
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
            </>
          )}
        </Box>
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
        <NotificationAccessSnackbar />
      </Container>

      <Sidepanel chores={chores} performers={performers} />
    </div>
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
