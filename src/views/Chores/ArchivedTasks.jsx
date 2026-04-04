import {
  Archive,
  CheckBox,
  CheckBoxOutlineBlank,
  Close,
  Delete,
  SelectAll,
  Unarchive,
  ViewAgenda,
  ViewModule,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Input,
  List,
  Stack,
  Typography,
} from '@mui/joy'
import Fuse from 'fuse.js'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import KeyboardShortcutHint from '../../components/common/KeyboardShortcutHint'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext.jsx'
import { useUnArchiveChore } from '../../queries/ChoreQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { DeleteChore, GetArchivedChores } from '../../utils/Fetcher'
import LoadingComponent from '../components/Loading'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import ChoreCard from './ChoreCard'
import ChoreListView from './ChoreListView.jsx'
import CompactChoreCard from './CompactChoreCard'
import MultiSelectHelp from './MultiSelectHelp'

const ArchivedTasks = () => {
  const { t } = useTranslation(['chores', 'common'])
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useUserProfile()
  const { showSuccess, showError } = useNotification()
  const { impersonatedUser } = useImpersonateUser()
  const unArchiveChore = useUnArchiveChore()
  const [archivedChores, setArchivedChores] = useState([])
  const [filteredChores, setFilteredChores] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [performers, setPerformers] = useState([])
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState(
    localStorage.getItem('archivedChoreCardViewMode') || 'default',
  )
  const [isLoading, setIsLoading] = useState(true)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const searchInputRef = useRef(null)

  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedChores, setSelectedChores] = useState(new Set())
  const [confirmModelConfig, setConfirmModelConfig] = useState({})

  const { data: membersData, isLoading: membersLoading } = useCircleMembers()

  useEffect(() => {
    const loadArchivedChores = async () => {
      if (!membersLoading && userProfile) {
        setPerformers(membersData.res)
        try {
          const response = await GetArchivedChores()
          const data = await response.json()
          // Sort by updatedAt (most recent first)
          const sortedChores = data.res.sort((a, b) => {
            const dateA = new Date(a.updatedAt || 0)
            const dateB = new Date(b.updatedAt || 0)
            return dateB - dateA
          })
          setArchivedChores(sortedChores)
          setFilteredChores(sortedChores)
        } catch (error) {
          showError({
            title: t('chores:main.archivedLoadFailed'),
            message: t('chores:main.tryAgainLater'),
          })
        } finally {
          setIsLoading(false)
        }
      }
    }
    loadArchivedChores()
  }, [membersLoading, userProfile, membersData])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = event => {
      const isHoldingCmdOrCtrl = event.ctrlKey || event.metaKey

      if (isHoldingCmdOrCtrl) {
        setShowKeyboardShortcuts(true)
      }

      // Ctrl/Cmd + F to focus search input
      if (isHoldingCmdOrCtrl && event.key === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      // Ctrl/Cmd + S Toggle Multi-select mode
      if (isHoldingCmdOrCtrl && event.key === 's') {
        event.preventDefault()
        toggleMultiSelectMode()
        return
      }

      // Ctrl/Cmd + A to select all
      if (
        isHoldingCmdOrCtrl &&
        !event.shiftKey &&
        event.key === 'a' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        event.preventDefault()
        if (!isMultiSelectMode) {
          setIsMultiSelectMode(true)
          setTimeout(() => {
            selectAllVisibleChores()
          }, 0)
        } else {
          selectAllVisibleChores()
        }
      }

      // Multi-select keyboard shortcuts
      if (isMultiSelectMode) {
        // Escape to clear selection or exit multi-select mode
        if (event.key === 'Escape') {
          event.preventDefault()
          if (selectedChores.size > 0) {
            clearSelection()
          } else {
            setIsMultiSelectMode(false)
          }
          return
        }

        // "r" key for bulk restore (unarchive)
        if (
          isHoldingCmdOrCtrl &&
          event.key === 'r' &&
          selectedChores.size > 0
        ) {
          event.preventDefault()
          handleBulkRestore()
          return
        }

        // "e" key for bulk delete
        if (
          isHoldingCmdOrCtrl &&
          event.key === 'e' &&
          selectedChores.size > 0
        ) {
          event.preventDefault()
          handleBulkDelete()
          return
        }
      }
    }

    const handleKeyUp = event => {
      if (!event.ctrlKey && !event.metaKey) {
        setShowKeyboardShortcuts(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [isMultiSelectMode, selectedChores.size])

  const toggleViewMode = () => {
    const modes = ['default', 'compact']
    const currentIndex = modes.indexOf(viewMode)
    const nextIndex = (currentIndex + 1) % modes.length
    const newMode = modes[nextIndex]
    setViewMode(newMode)
    localStorage.setItem('archivedChoreCardViewMode', newMode)
  }

  const searchOptions = {
    keys: ['name', 'raw_label'],
    includeScore: true,
    isCaseSensitive: false,
    findAllMatches: true,
  }

  const fuse = new Fuse(
    archivedChores.map(c => ({
      ...c,
      raw_label: c.labelsV2?.map(c => c.name).join(' '),
    })),
    searchOptions,
  )

  const handleSearchChange = e => {
    const search = e.target.value
    if (search === '') {
      setFilteredChores(archivedChores)
      setSearchTerm('')
      return
    }

    const term = search.toLowerCase()
    setSearchTerm(term)
    setFilteredChores(fuse.search(term).map(result => result.item))
  }

  const handleSearchClose = () => {
    setSearchTerm('')
    setFilteredChores(archivedChores)
    searchInputRef.current?.blur()
  }

  const handleChoreUpdated = (updatedChore, event) => {
    if (event === 'unarchive') {
      // Remove from archived list when unarchived
      const newArchivedChores = archivedChores.filter(
        chore => chore.id !== updatedChore.id,
      )
      const newFilteredChores = filteredChores.filter(
        chore => chore.id !== updatedChore.id,
      )
      setArchivedChores(newArchivedChores)
      setFilteredChores(newFilteredChores)

      showSuccess({
        title: 'Task Restored',
        message: t('chores:main.archivedRestoreMessage'),
      })
    }
  }

  const handleChoreDeleted = deletedChore => {
    const newArchivedChores = archivedChores.filter(
      chore => chore.id !== deletedChore.id,
    )
    const newFilteredChores = filteredChores.filter(
      chore => chore.id !== deletedChore.id,
    )
    setArchivedChores(newArchivedChores)
    setFilteredChores(newFilteredChores)

    showSuccess({
      title: 'Task Deleted',
      message: t('chores:main.archivedDeleteMessage'),
    })
  }

  // Multi-select helper functions
  const toggleMultiSelectMode = () => {
    const newMode = !isMultiSelectMode
    setIsMultiSelectMode(newMode)

    if (!newMode) {
      setSelectedChores(new Set())
    }
  }

  const toggleChoreSelection = choreId => {
    const newSelection = new Set(selectedChores)
    if (newSelection.has(choreId)) {
      newSelection.delete(choreId)
    } else {
      newSelection.add(choreId)
    }
    setSelectedChores(newSelection)
  }

  const selectAllVisibleChores = () => {
    const visibleChores =
      searchTerm?.length > 0 ? filteredChores : archivedChores
    if (visibleChores.length > 0) {
      const allIds = new Set(visibleChores.map(chore => chore.id))
      setSelectedChores(allIds)
    }
  }

  const clearSelection = () => {
    if (selectedChores.size === 0) {
      setIsMultiSelectMode(false)
      return
    }
    setSelectedChores(new Set())
  }

  const getSelectedChoresData = () => {
    return Array.from(selectedChores)
      .map(id => archivedChores.find(chore => chore.id === id))
      .filter(Boolean)
  }

  // Bulk operations
  const handleBulkRestore = async () => {
    const selectedData = getSelectedChoresData()
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: 'Restore Tasks',
      confirmText: 'Restore',
      cancelText: 'Cancel',
      message: `Restore ${selectedData.length} task${selectedData.length > 1 ? 's' : ''} to active list?`,
      onClose: async isConfirmed => {
        if (isConfirmed === true) {
          try {
            const restoredTasks = []
            const failedTasks = []

            for (const chore of selectedData) {
              try {
                await new Promise((resolve, reject) => {
                  unArchiveChore.mutate(chore.id, {
                    onSuccess: data => {
                      restoredTasks.push(chore)
                      resolve(data)
                    },
                    onError: error => {
                      failedTasks.push(chore)
                      reject(error)
                    },
                  })
                })
              } catch (error) {
                // Error already handled in onError callback
              }
            }

            if (restoredTasks.length > 0) {
              showSuccess({
                title: t('chores:main.restoredTasksTitle'),
                message: t('chores:main.restoredTasks', {
                  count: restoredTasks.length,
                }),
              })

              // Remove restored tasks from archived list
              const restoredIds = new Set(restoredTasks.map(c => c.id))
              const newArchivedChores = archivedChores.filter(
                c => !restoredIds.has(c.id),
              )
              const newFilteredChores = filteredChores.filter(
                c => !restoredIds.has(c.id),
              )
              setArchivedChores(newArchivedChores)
              setFilteredChores(newFilteredChores)
            }

            if (failedTasks.length > 0) {
              showError({
                title: t('chores:actionFeedback.bulk.someFailedTitle'),
                message: t('chores:main.restoredFailed', {
                  count: failedTasks.length,
                }),
              })
            }

            clearSelection()
          } catch (error) {
            showError({
              title: t('chores:main.bulkRestoreFailed'),
              message: t('chores:main.unexpectedError'),
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }

  const handleBulkDelete = async () => {
    const selectedData = getSelectedChoresData()
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: t('chores:main.deleteArchivedTitle'),
      confirmText: t('common:actions.delete'),
      cancelText: t('common:actions.cancel'),
      message: t('chores:main.deleteArchivedConfirm', {
        count: selectedData.length,
      }),
      onClose: async isConfirmed => {
        if (isConfirmed === true) {
          try {
            const deletedTasks = []
            const failedTasks = []

            for (const chore of selectedData) {
              try {
                await DeleteChore(chore.id)
                deletedTasks.push(chore)
              } catch (error) {
                failedTasks.push(chore)
              }
            }

            if (deletedTasks.length > 0) {
              showSuccess({
                title: t('chores:actionFeedback.bulk.deleteSuccessTitle'),
                message: t('chores:actionFeedback.bulk.deleteSuccess', {
                  count: deletedTasks.length,
                }),
              })

              const deletedIds = new Set(deletedTasks.map(c => c.id))
              const newArchivedChores = archivedChores.filter(
                c => !deletedIds.has(c.id),
              )
              const newFilteredChores = filteredChores.filter(
                c => !deletedIds.has(c.id),
              )
              setArchivedChores(newArchivedChores)
              setFilteredChores(newFilteredChores)
            }

            if (failedTasks.length > 0) {
              showError({
                title: t('chores:actionFeedback.bulk.someFailedTitle'),
                message: t('chores:actionFeedback.bulk.deleteFailed', {
                  count: failedTasks.length,
                }),
              })
            }

            clearSelection()
          } catch (error) {
            showError({
              title: t('chores:actionFeedback.bulk.deleteUnexpectedTitle'),
              message: t('chores:main.unexpectedError'),
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }

  // Helper function to render the appropriate card component
  const renderChoreCard = (chore, key) => {
    const CardComponent = viewMode === 'compact' ? CompactChoreCard : ChoreCard
    return (
      <CardComponent
        key={key || chore.id}
        chore={chore}
        onChoreUpdate={handleChoreUpdated}
        onChoreRemove={handleChoreDeleted}
        performers={performers}
        viewOnly={false}
        showActions={false}
        // Multi-select props
        isMultiSelectMode={isMultiSelectMode}
        isSelected={selectedChores.has(chore.id)}
        onSelectionToggle={() => toggleChoreSelection(chore.id)}
      />
    )
  }

  if (isUserProfileLoading || performers.length === 0 || isLoading) {
    return <LoadingComponent />
  }

  return (
    <Container maxWidth='md'>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {/* <EmojiEvents sx={{ fontSize: '2rem', color: '#FFD700' }} /> */}
        <Stack sx={{ flex: 1 }}>
          <Typography
            level='h3'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            {t('chores:main.archivedTitle')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('chores:main.archivedDescription')}
          </Typography>
        </Stack>
      </Box>
      {/* Header */}
      {/* <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          pt: 2,
        }}
      >
        <Typography
          level='h3'
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Archive />
          Archived Tasks
        </Typography>
        <Button
          variant='outlined'
          color='neutral'
          startDecorator={<Close />}
          onClick={() => navigate('/chores')}
          sx={{ ml: 'auto' }}
        >
          Close
        </Button>
      </Box> */}

      {/* Search and Controls */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignContent: 'center',
          alignItems: 'center',
          gap: 0.5,
          mb: 2,
        }}
      >
        <Input
          slotProps={{ input: { ref: searchInputRef } }}
          placeholder={t('chores:main.archivedSearch')}
          value={searchTerm}
          fullWidth
          sx={{
            borderRadius: 24,
            height: 24,
            borderColor: 'text.disabled',
            padding: 1,
          }}
          onChange={handleSearchChange}
          startDecorator={
            <KeyboardShortcutHint shortcut='F' show={showKeyboardShortcuts} />
          }
          endDecorator={
            searchTerm && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <KeyboardShortcutHint
                  shortcut='X'
                  show={showKeyboardShortcuts}
                />
                <IconButton
                  variant='plain'
                  size='sm'
                  onClick={handleSearchClose}
                  sx={{ borderRadius: '50%' }}
                >
                  <Close />
                </IconButton>
              </Box>
            )
          }
        />

        {/* View Mode Toggle Button */}
        <IconButton
          variant='outlined'
          color='neutral'
          size='sm'
          sx={{
            height: 32,
            width: 32,
            borderRadius: '50%',
          }}
          onClick={toggleViewMode}
          title={
            viewMode === 'default'
              ? t('chores:main.viewCompact')
              : t('chores:main.viewCard')
          }
        >
          {viewMode === 'default' ? <ViewAgenda /> : <ViewModule />}
        </IconButton>

        {/* Multi-select Toggle Button */}
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <IconButton
            variant={isMultiSelectMode ? 'solid' : 'outlined'}
            color={isMultiSelectMode ? 'primary' : 'neutral'}
            size='sm'
            sx={{
              height: 32,
              width: 32,
              borderRadius: '50%',
            }}
            onClick={toggleMultiSelectMode}
            title={
              isMultiSelectMode
                ? t('chores:main.exitMultiSelect')
                : t('chores:main.enableMultiSelect')
            }
          >
            {isMultiSelectMode ? <CheckBox /> : <CheckBoxOutlineBlank />}
          </IconButton>
          <KeyboardShortcutHint
            shortcut='S'
            show={showKeyboardShortcuts}
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              zIndex: 1000,
            }}
          />
        </Box>
      </Box>

      {/* Multi-select Toolbar */}
      {isMultiSelectMode && (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            mb: 2,
          }}
        >
          <Box
            sx={{
              backgroundColor: 'background.surface',
              backdropFilter: 'blur(8px)',
              borderRadius: 'lg',
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'm',
              gap: 2,
              display: 'flex',
              flexDirection: {
                sm: 'column',
                md: 'row',
              },
              alignItems: {
                xs: 'stretch',
                sm: 'center',
              },
              justifyContent: {
                xs: 'center',
                sm: 'space-between',
              },
            }}
          >
            {/* Selection Info and Controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: {
                  xs: 'wrap',
                  sm: 'nowrap',
                },
                justifyContent: {
                  xs: 'center',
                  sm: 'flex-start',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckBox sx={{ color: 'primary.500' }} />
                <Typography level='body-sm' fontWeight='md'>
                  {selectedChores.size} task
                  {selectedChores.size !== 1 ? 's' : ''} selected
                </Typography>
              </Box>

              <Divider
                orientation='vertical'
                sx={{
                  display: { xs: 'none', sm: 'block' },
                }}
              />

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size='sm'
                  variant='outlined'
                  onClick={selectAllVisibleChores}
                  startDecorator={<SelectAll />}
                  disabled={selectedChores.size === filteredChores.length}
                  sx={{
                    minWidth: 'auto',
                    '--Button-paddingInline': '0.75rem',
                    position: 'relative',
                  }}
                  title={t('chores:main.shortcuts.selectAllVisible')}
                >
                  {t('chores:main.all')}
                  {showKeyboardShortcuts && (
                    <KeyboardShortcutHint
                      shortcut='A'
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        zIndex: 1000,
                      }}
                    />
                  )}
                </Button>
                <Button
                  size='sm'
                  variant='outlined'
                  onClick={clearSelection}
                  startDecorator={
                    selectedChores.size === 0 ? (
                      <Close />
                    ) : (
                      <CheckBoxOutlineBlank />
                    )
                  }
                  sx={{
                    minWidth: 'auto',
                    '--Button-paddingInline': '0.75rem',
                    position: 'relative',
                  }}
                  title={
                    selectedChores.size === 0
                      ? t('chores:main.shortcuts.closeMultiSelect')
                      : t('chores:main.shortcuts.clearMultiSelect')
                  }
                >
                  {selectedChores.size === 0
                    ? t('common:actions.close')
                    : t('chores:main.clear')}
                  {showKeyboardShortcuts && (
                    <KeyboardShortcutHint
                      withCtrl={false}
                      shortcut='Esc'
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        zIndex: 1000,
                      }}
                    />
                  )}
                </Button>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: {
                  xs: 'wrap',
                  sm: 'nowrap',
                },
                justifyContent: {
                  xs: 'center',
                  sm: 'flex-end',
                },
              }}
            >
              <Button
                size='sm'
                variant='solid'
                color='success'
                onClick={handleBulkRestore}
                startDecorator={<Unarchive />}
                disabled={selectedChores.size === 0}
                sx={{
                  '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
                  position: 'relative',
                }}
                title={t('chores:main.shortcuts.restoreSelected')}
              >
                {t('chores:main.restore')}
                {showKeyboardShortcuts && selectedChores.size > 0 && (
                  <KeyboardShortcutHint
                    shortcut='R'
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      zIndex: 1000,
                    }}
                  />
                )}
              </Button>

              <Button
                size='sm'
                variant='soft'
                color='danger'
                onClick={handleBulkDelete}
                startDecorator={<Delete />}
                disabled={selectedChores.size === 0}
                sx={{
                  '--Button-paddingInline': { xs: '0.75rem', sm: '1rem' },
                  position: 'relative',
                }}
                title={t('chores:main.shortcuts.deleteSelected')}
              >
                {t('common:actions.delete')}
                {showKeyboardShortcuts && selectedChores.size > 0 && (
                  <KeyboardShortcutHint
                    shortcut='E'
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      zIndex: 1000,
                    }}
                  />
                )}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Content */}
      {filteredChores.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            height: '50vh',
          }}
        >
          <Archive
            sx={{
              fontSize: '4rem',
              mb: 1,
              color: 'text.tertiary',
            }}
          />
          <Typography level='title-md' gutterBottom>
            {searchTerm
              ? t('chores:main.noArchivedFound')
              : t('chores:main.noArchived')}
          </Typography>
          <Typography level='body-sm' color='text.secondary' sx={{ mb: 2 }}>
            {searchTerm
              ? t('chores:main.adjustSearch')
              : t('chores:main.archivedWillAppear')}
          </Typography>
          {searchTerm && (
            <Button
              onClick={handleSearchClose}
              variant='outlined'
              color='neutral'
            >
              {t('chores:main.clearSearch')}
            </Button>
          )}
        </Box>
      ) : (
        <Box>
          <Typography level='body-sm' color='text.secondary' sx={{ mb: 2 }}>
            {t('chores:main.archivedCount', { count: filteredChores.length })}
            {searchTerm && t('chores:main.matchingSearch', { term: searchTerm })}
          </Typography>

          <List sx={{ gap: viewMode === 'compact' ? 0 : 1 }}>
            <ChoreListView
              chores={filteredChores}
              // viewOnly={true}
              showActions={false}
              viewMode={viewMode}
              membersData={membersData}
              isMultiSelectMode={isMultiSelectMode}
              selectedChores={selectedChores}
              toggleChoreSelection={toggleChoreSelection}
            />
          </List>
        </Box>
      )}

      {/* Multi-select Help */}
      <MultiSelectHelp isVisible={isMultiSelectMode} />

      {/* Confirmation Modal */}
      {confirmModelConfig?.isOpen && (
        <ConfirmationModal config={confirmModelConfig} />
      )}
    </Container>
  )
}

export default ArchivedTasks
