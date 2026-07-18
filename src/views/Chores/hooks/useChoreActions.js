import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  useArchiveChore,
  useUnArchiveChore,
} from '../../../queries/ChoreQueries'
import { usePauseChore, useStartChore } from '../../../queries/TimeQueries'
import { commandQueue, CommandType } from '../../../utils/CommandQueue'
import {
  ApproveChore,
  DeleteChore,
  MarkChoreComplete,
  NudgeChore,
  RejectChore,
  SaveChore,
  SkipChore,
  UndoChoreAction,
  UpdateChoreAssignee,
  UpdateDueDate,
} from '../../../utils/Fetcher'
import { offlineDB } from '../../../utils/OfflineDB'
import { isOfflineFeatureEnabled } from '../../../utils/OfflineFeatureToggle'

// Effectively "can this action be queued offline?" — requires the offline
// feature, otherwise there is no command queue to replay it later.
const isNetworkError = err =>
  isOfflineFeatureEnabled() &&
  err instanceof TypeError &&
  err.message === 'Failed to fetch'

export const useChoreActions = ({
  chores,
  filteredChores,
  setChores,
  setFilteredChores,
  userProfile,
  impersonatedUser,
  showSuccess,
  showError,
  showWarning,
  showUndo,
  refetchChores,
  setConfirmModelConfig,
  openModal,
  closeModal,
  modalChore,
  getSelectedChoresData,
  clearSelection,
}) => {
  const queryClient = useQueryClient()
  const archiveChore = useArchiveChore()
  const unarchiveChore = useUnArchiveChore()
  const startChore = useStartChore()
  const pauseChore = usePauseChore()

  const updateChoreInState = useCallback(
    (updatedChore, event, { skipInvalidation = false } = {}) => {
      let newChores = chores.map(c =>
        c.id === updatedChore.id ? updatedChore : c,
      )
      let newFilteredChores = filteredChores.map(c =>
        c.id === updatedChore.id ? updatedChore : c,
      )

      if (
        event === 'archive' ||
        (event === 'completed' && updatedChore.frequencyType === 'once') ||
        updatedChore.frequencyType === 'trigger'
      ) {
        newChores = newChores.filter(c => c.id !== updatedChore.id)
        newFilteredChores = newFilteredChores.filter(
          c => c.id !== updatedChore.id,
        )
      }

      setChores(newChores)
      setFilteredChores(newFilteredChores)

      if (!skipInvalidation) {
        queryClient.invalidateQueries(['chores'])
      }

      const undoableActions = {
        completed: 'Task completed',
        approved: 'Task approved',
        rejected: 'Task rejected',
        skipped: 'Task skipped',
      }

      if (undoableActions[event]) {
        showSuccess({
          message: undoableActions[event],
          undoAction: async () => {
            try {
              const undoResponse = await UndoChoreAction(updatedChore.id)
              if (undoResponse.ok) {
                queryClient.invalidateQueries(['chores'])
                const undoMessages = {
                  completed: 'Task completion has been undone.',
                  approved: 'Task approval has been undone.',
                  rejected: 'Task rejection has been undone.',
                  skipped: 'Task skip has been undone.',
                }
                showUndo({
                  title: 'Undo Successful',
                  message: undoMessages[event],
                })
              } else {
                throw new Error('Failed to undo')
              }
            } catch (error) {
              showError({
                title: 'Undo Failed',
                message: 'Unable to undo the action. Please try again.',
              })
            }
          },
        })
        return
      }

      const notifications = {
        rescheduled: {
          type: 'success',
          title: 'Task Rescheduled',
          message: 'The task due date has been updated successfully.',
        },
        'due-date-removed': {
          type: 'success',
          title: 'Task Unplanned',
          message: 'The task is now unplanned and has no due date.',
        },
        unarchive: {
          type: 'success',
          title: 'Task Restored',
          message: 'The task has been restored and is now active.',
        },
        archive: {
          type: 'success',
          title: 'Task Archived',
          message:
            'The task has been archived and hidden from the active list.',
        },
        started: {
          type: 'success',
          title: 'Task Started',
          message: 'The task has been marked as started.',
        },
        paused: {
          type: 'warning',
          title: 'Task Paused',
          message: 'The task has been paused.',
        },
        deleted: {
          type: 'success',
          title: 'Task Deleted',
          message: 'The task has been deleted.',
        },
      }

      const notification = notifications[event]
      if (notification) {
        const notifyFn =
          notification.type === 'warning' ? showWarning : showSuccess
        notifyFn({ title: notification.title, message: notification.message })
      }
    },
    [
      chores,
      filteredChores,
      setChores,
      setFilteredChores,
      queryClient,
      showSuccess,
      showError,
      showWarning,
      showUndo,
    ],
  )

  const handleChoreAction = useCallback(
    async (action, chore, extraData = {}) => {
      switch (action) {
        case 'complete':
          try {
            const response = await MarkChoreComplete(
              chore.id,
              impersonatedUser
                ? { completedBy: impersonatedUser.userId }
                : null,
              null,
              null,
            )
            if (response.ok) {
              // Online: hide the chore and show undo
              setChores(prev => prev.filter(c => c.id !== chore.id))
              setFilteredChores(prev => prev.filter(c => c.id !== chore.id))
              queryClient.setQueriesData({ queryKey: ['chores'] }, oldData => {
                if (!oldData || !oldData.res) return oldData
                return {
                  ...oldData,
                  res: oldData.res.filter(c => c.id !== chore.id),
                }
              })
              showSuccess({
                message: 'Task completed',
                undoAction: async () => {
                  try {
                    const undoResponse = await UndoChoreAction(chore.id)
                    if (undoResponse.ok) {
                      queryClient.invalidateQueries(['chores'])
                      showUndo({
                        title: 'Undo Successful',
                        message: 'Task completion has been undone.',
                      })
                    } else throw new Error('Failed to undo')
                  } catch {
                    showError({
                      title: 'Undo Failed',
                      message: 'Unable to undo the action. Please try again.',
                    })
                  }
                },
              })
              queryClient.invalidateQueries(['chores'])
            } else {
              refetchChores()
            }
          } catch (error) {
            if (isNetworkError(error)) {
              // Offline — queue and show pending badge on the chore (don't hide it)
              const cmdId = await commandQueue.enqueue(
                CommandType.COMPLETE_CHORE,
                chore.id,
                {
                  id: chore.id,
                  body: impersonatedUser
                    ? { completedBy: impersonatedUser.userId }
                    : null,
                  completedDate: null,
                  performer: null,
                },
              )
              await offlineDB.savePendingHistory({
                id: -Date.now(),
                choreId: chore.id,
                completedBy: impersonatedUser?.userId || userProfile?.id || 0,
                performedAt: new Date().toISOString(),
                dueDate: chore.nextDueDate || null,
                notes: null,
                status: 1,
                points: chore.points || 0,
                pending: true,
              })
              queryClient.invalidateQueries({ queryKey: ['pendingCommands'] })
              showSuccess({
                title: 'Task completion pending',
                message:
                  "You're offline — completion will sync when back online",
                undoAction: async () => {
                  await commandQueue.cancel(cmdId)
                  queryClient.invalidateQueries({
                    queryKey: ['pendingCommands'],
                  })
                },
              })
            } else {
              showError({
                title: 'Failed to complete',
                message: error?.message || 'Unable to complete chore',
              })
            }
          }
          break

        case 'start': {
          const startedChore = { ...chore, status: 1 }
          try {
            await startChore.mutateAsync(chore.id)
            queryClient.cancelQueries(['chores'])
            queryClient.setQueryData(['chores', false], oldData => {
              if (!oldData?.res) return oldData
              return {
                ...oldData,
                res: oldData.res.map(c =>
                  c.id === chore.id ? startedChore : c,
                ),
              }
            })
            updateChoreInState(startedChore, 'started', {
              skipInvalidation: true,
            })
          } catch (error) {
            if (isNetworkError(error)) {
              const previousStatus = chore.status
              const cmdId = await commandQueue.enqueue(
                CommandType.START_CHORE,
                chore.id,
                { id: chore.id },
              )
              updateChoreInState(startedChore, 'started', {
                skipInvalidation: true,
              })
              queryClient.invalidateQueries({ queryKey: ['pendingCommands'] })
              showSuccess({
                message: "You're offline — start will sync when back online",
                undoAction: async () => {
                  await commandQueue.cancel(cmdId)
                  queryClient.invalidateQueries({
                    queryKey: ['pendingCommands'],
                  })
                  updateChoreInState(
                    { ...chore, status: previousStatus },
                    previousStatus === 2 ? 'paused' : 'started',
                    { skipInvalidation: true },
                  )
                },
              })
            } else {
              showError({
                title: 'Failed to start',
                message: error?.message || 'Unable to start chore',
              })
            }
          }
          break
        }

        case 'pause': {
          const pausedChore = { ...chore, status: 2 }
          try {
            await pauseChore.mutateAsync(chore.id)
            queryClient.cancelQueries(['chores'])
            queryClient.setQueryData(['chores', false], oldData => {
              if (!oldData?.res) return oldData
              return {
                ...oldData,
                res: oldData.res.map(c =>
                  c.id === chore.id ? pausedChore : c,
                ),
              }
            })
            updateChoreInState(pausedChore, 'paused', {
              skipInvalidation: true,
            })
          } catch (error) {
            if (isNetworkError(error)) {
              const previousStatus = chore.status
              const cmdId = await commandQueue.enqueue(
                CommandType.PAUSE_CHORE,
                chore.id,
                { id: chore.id },
              )
              updateChoreInState(pausedChore, 'paused', {
                skipInvalidation: true,
              })
              queryClient.invalidateQueries({ queryKey: ['pendingCommands'] })
              showSuccess({
                message: "You're offline — pause will sync when back online",
                undoAction: async () => {
                  await commandQueue.cancel(cmdId)
                  queryClient.invalidateQueries({
                    queryKey: ['pendingCommands'],
                  })
                  updateChoreInState(
                    { ...chore, status: previousStatus },
                    previousStatus === 2 ? 'paused' : 'started',
                    { skipInvalidation: true },
                  )
                },
              })
            } else {
              showError({
                title: 'Failed to pause',
                message: error?.message || 'Unable to pause chore',
              })
            }
          }
          break
        }

        case 'approve':
          try {
            const response = await ApproveChore(chore.id)
            if (response.ok) {
              const data = await response.json()
              updateChoreInState(data.res, 'approved')
            }
          } catch (error) {
            showError({
              title: 'Failed to approve',
              message: error.message || 'Unable to approve chore',
            })
          }
          break

        case 'reject':
          try {
            const response = await RejectChore(chore.id)
            if (response.ok) {
              const data = await response.json()
              updateChoreInState(data.res, 'rejected')
            }
          } catch (error) {
            showError({
              title: 'Failed to reject',
              message: error.message || 'Unable to reject chore',
            })
          }
          break

        case 'delete':
          setConfirmModelConfig({
            isOpen: true,
            title: 'Delete Chore',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            message: 'Are you sure you want to delete this chore?',
            onClose: async isConfirmed => {
              if (isConfirmed === true) {
                try {
                  const response = await DeleteChore(chore.id)
                  if (response.ok) {
                    const newChores = chores.filter(c => c.id !== chore.id)
                    const newFilteredChores = filteredChores.filter(
                      c => c.id !== chore.id,
                    )
                    setChores(newChores)
                    setFilteredChores(newFilteredChores)
                    queryClient.invalidateQueries(['chores'])
                    showSuccess({
                      title: 'Task Deleted',
                      message: 'The task has been deleted successfully.',
                    })
                  }
                } catch (error) {
                  if (isNetworkError(error)) {
                    const cmdId = await commandQueue.enqueue(
                      CommandType.DELETE_CHORE,
                      chore.id,
                      { id: chore.id },
                    )
                    setChores(prev => prev.filter(c => c.id !== chore.id))
                    setFilteredChores(prev =>
                      prev.filter(c => c.id !== chore.id),
                    )
                    queryClient.invalidateQueries({
                      queryKey: ['pendingCommands'],
                    })
                    showSuccess({
                      message:
                        "You're offline — deletion will sync when back online",
                      undoAction: async () => {
                        await commandQueue.cancel(cmdId)
                        queryClient.invalidateQueries({
                          queryKey: ['pendingCommands'],
                        })
                        setChores(prev => [...prev, chore])
                        setFilteredChores(prev => [...prev, chore])
                      },
                    })
                  } else {
                    showError({
                      title: 'Failed to delete',
                      message: error?.message || 'Unable to delete chore',
                    })
                  }
                }
              }
              setConfirmModelConfig({})
            },
          })
          break

        case 'archive':
          try {
            await new Promise((resolve, reject) => {
              archiveChore.mutate(chore.id, {
                onSuccess: data => {
                  updateChoreInState(chore, 'archive')
                  resolve(data)
                },
                onError: async error => {
                  if (isNetworkError(error)) {
                    const cmdId = await commandQueue.enqueue(
                      CommandType.ARCHIVE_CHORE,
                      chore.id,
                      { id: chore.id },
                    )
                    await offlineDB.saveChores([
                      { ...chore, isActive: false, _pending: 'archive' },
                    ])
                    setChores(prev => prev.filter(c => c.id !== chore.id))
                    setFilteredChores(prev =>
                      prev.filter(c => c.id !== chore.id),
                    )
                    queryClient.invalidateQueries({
                      queryKey: ['pendingCommands'],
                    })
                    showSuccess({
                      message:
                        "You're offline — archive will sync when back online",
                      undoAction: async () => {
                        await commandQueue.cancel(cmdId)
                        await offlineDB.saveChores([
                          { ...chore, isActive: true },
                        ])
                        queryClient.invalidateQueries({
                          queryKey: ['pendingCommands'],
                        })
                        setChores(prev => [...prev, chore])
                        setFilteredChores(prev => [...prev, chore])
                      },
                    })
                    resolve()
                  } else {
                    showError({
                      title: 'Failed to archive',
                      message: error.message || 'Unable to archive chore',
                    })
                    reject(error)
                  }
                },
              })
            })
          } catch (error) {}
          break

        case 'unarchive':
          try {
            await new Promise((resolve, reject) => {
              unarchiveChore.mutate(chore.id, {
                onSuccess: data => {
                  updateChoreInState({ ...chore, isActive: true }, 'unarchive')
                  resolve(data)
                },
                onError: async error => {
                  if (isNetworkError(error)) {
                    const cmdId = await commandQueue.enqueue(
                      CommandType.UNARCHIVE_CHORE,
                      chore.id,
                      { id: chore.id },
                    )
                    await offlineDB.saveChores([
                      { ...chore, isActive: true, _pending: 'unarchive' },
                    ])
                    queryClient.invalidateQueries({
                      queryKey: ['pendingCommands'],
                    })
                    showSuccess({
                      message:
                        "You're offline — restore will sync when back online",
                      undoAction: async () => {
                        await commandQueue.cancel(cmdId)
                        await offlineDB.saveChores([
                          { ...chore, isActive: false },
                        ])
                        queryClient.invalidateQueries({
                          queryKey: ['pendingCommands'],
                        })
                      },
                    })
                    resolve()
                  } else {
                    showError({
                      title: 'Failed to restore',
                      message: error.message || 'Unable to restore chore',
                    })
                    reject(error)
                  }
                },
              })
            })
          } catch (error) {}
          break

        case 'skip':
          try {
            const response = await SkipChore(chore.id)
            if (response.ok) {
              // Online: update in place (chore gets new due date)
              const data = await response.json()
              updateChoreInState(data.res, 'skipped')
            } else {
              refetchChores()
            }
          } catch (error) {
            if (isNetworkError(error)) {
              // Offline — queue and show pending badge on the chore
              const cmdId = await commandQueue.enqueue(
                CommandType.SKIP_CHORE,
                chore.id,
                { id: chore.id },
              )
              queryClient.invalidateQueries({ queryKey: ['pendingCommands'] })
              showSuccess({
                message: "You're offline — skip will sync when back online",
                undoAction: async () => {
                  await commandQueue.cancel(cmdId)
                  queryClient.invalidateQueries({
                    queryKey: ['pendingCommands'],
                  })
                },
              })
            } else {
              showError({
                title: 'Failed to skip',
                message: error?.message || 'Unable to skip chore',
              })
            }
          }
          break

        case 'changeDueDate':
          if (extraData && 'date' in extraData) {
            try {
              const response = await UpdateDueDate(chore.id, extraData.date)
              if (response.ok) {
                chore.nextDueDate = extraData.date
                const eventType =
                  extraData.date === null ? 'due-date-removed' : 'rescheduled'
                updateChoreInState(chore, eventType)
              }
            } catch (error) {
              if (isNetworkError(error)) {
                const oldDueDate = chore.nextDueDate
                const cmdId = await commandQueue.enqueue(
                  CommandType.RESCHEDULE_CHORE,
                  chore.id,
                  {
                    id: chore.id,
                    dueDate: extraData.date,
                  },
                )
                const eventType =
                  extraData.date === null ? 'due-date-removed' : 'rescheduled'
                updateChoreInState(
                  { ...chore, nextDueDate: extraData.date },
                  eventType,
                )
                queryClient.invalidateQueries({ queryKey: ['pendingCommands'] })
                showSuccess({
                  message:
                    "You're offline — reschedule will sync when back online",
                  undoAction: async () => {
                    await commandQueue.cancel(cmdId)
                    queryClient.invalidateQueries({
                      queryKey: ['pendingCommands'],
                    })
                    const undoEventType =
                      oldDueDate === null ? 'due-date-removed' : 'rescheduled'
                    updateChoreInState(
                      { ...chore, nextDueDate: oldDueDate },
                      undoEventType,
                    )
                  },
                })
              } else {
                showError({
                  title:
                    extraData.date === null
                      ? 'Failed to remove due date'
                      : 'Failed to reschedule',
                  message: error.message || 'Unable to update due date',
                })
              }
            }
          } else {
            openModal(action, chore, extraData)
          }
          break

        case 'moveToProject': {
          const project = extraData?.project
          const projectId = project?.id === null ? null : project?.id
          const updatedChore = { ...chore, projectId }
          try {
            const response = await SaveChore(updatedChore)
            if (response.ok) {
              updateChoreInState(updatedChore, 'moved-to-project')
              showSuccess({
                title: 'Task Moved',
                message: `Task moved to ${project?.name || 'Default Project'}.`,
              })
            }
          } catch (error) {
            showError({
              title: 'Failed to move task',
              message: error?.message || 'Unable to move task to project',
            })
          }
          break
        }

        case 'completeWithNote':
        case 'completeWithPastDate':
        case 'changeAssignee':
        case 'writeNFC':
        case 'nudge':
          openModal(action, chore, extraData)
          break

        default:
          console.warn('Unknown action:', action)
      }
    },
    [
      impersonatedUser,
      chores,
      filteredChores,
      setChores,
      setFilteredChores,
      updateChoreInState,
      showError,
      showSuccess,
      setConfirmModelConfig,
      openModal,
      archiveChore,
      unarchiveChore,
      startChore,
      pauseChore,
    ],
  )

  const handleChangeDueDate = useCallback(
    async newDate => {
      if (!modalChore) return
      closeModal()
      try {
        const response = await UpdateDueDate(modalChore.id, newDate)
        if (response.ok) {
          updateChoreInState(
            { ...modalChore, nextDueDate: newDate },
            'rescheduled',
          )
        }
      } catch (error) {
        if (isNetworkError(error)) {
          const oldDueDate = modalChore.nextDueDate
          const cmdId = await commandQueue.enqueue(
            CommandType.RESCHEDULE_CHORE,
            modalChore.id,
            {
              id: modalChore.id,
              dueDate: newDate,
            },
          )
          updateChoreInState(
            { ...modalChore, nextDueDate: newDate },
            'rescheduled',
          )
          queryClient.invalidateQueries({ queryKey: ['pendingCommands'] })
          showSuccess({
            message: "You're offline — reschedule will sync when back online",
            undoAction: async () => {
              await commandQueue.cancel(cmdId)
              queryClient.invalidateQueries({ queryKey: ['pendingCommands'] })
              updateChoreInState(
                { ...modalChore, nextDueDate: oldDueDate },
                'rescheduled',
              )
            },
          })
        } else {
          showError({
            title: 'Failed to reschedule',
            message: error.message || 'Unable to update due date',
          })
        }
      }
    },
    [
      modalChore,
      updateChoreInState,
      closeModal,
      showSuccess,
      showError,
      queryClient,
    ],
  )

  const handleCompleteWithPastDate = useCallback(
    newDate => {
      if (!modalChore) return
      MarkChoreComplete(
        modalChore.id,
        impersonatedUser ? { completedBy: impersonatedUser.userId } : null,
        new Date(newDate).toISOString(),
        null,
      ).then(response => {
        if (response.ok) {
          response.json().then(data => {
            const newChore = data.res
            updateChoreInState(newChore, 'completed')
          })
        }
      })
      closeModal()
    },
    [modalChore, impersonatedUser, updateChoreInState, closeModal],
  )

  const handleAssigneeChange = useCallback(
    assigneeId => {
      if (!modalChore) return
      UpdateChoreAssignee(modalChore.id, assigneeId).then(response => {
        if (response.ok) {
          response.json().then(data => {
            const newChore = data.res
            updateChoreInState(newChore, 'assigned')
          })
        }
      })
      closeModal()
    },
    [modalChore, updateChoreInState, closeModal],
  )

  const handleCompleteWithNote = useCallback(
    note => {
      if (!modalChore) return
      MarkChoreComplete(
        modalChore.id,
        impersonatedUser
          ? { note, completedBy: impersonatedUser.userId }
          : { note },
        null,
        null,
      ).then(response => {
        if (response.ok) {
          response.json().then(data => {
            const newChore = data.res
            updateChoreInState(newChore, 'completed')
          })
        }
      })
      closeModal()
    },
    [modalChore, impersonatedUser, updateChoreInState, closeModal],
  )

  const handleNudge = useCallback(
    async ({ choreId, message, notifyAllAssignees }) => {
      try {
        const response = await NudgeChore(choreId, {
          message,
          notifyAllAssignees,
        })
        if (response.ok) {
          const data = await response.json()
          showSuccess({
            title: 'Nudge Sent!',
            message: data.message || 'Nudge sent successfully',
          })
        } else {
          throw new Error('Failed to send nudge')
        }
      } catch (error) {
        showError({
          title: 'Failed to Send Nudge',
          message: error.message || 'Unable to send nudge at this time',
        })
      } finally {
        closeModal()
      }
    },
    [showSuccess, showError, closeModal],
  )

  const handleBulkComplete = useCallback(async () => {
    const selectedData = getSelectedChoresData(chores)
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: 'Complete Tasks',
      confirmText: 'Complete',
      cancelText: 'Cancel',
      message: `Mark ${selectedData.length} task${selectedData.length > 1 ? 's' : ''} as completed?`,
      onClose: async isConfirmed => {
        if (isConfirmed === true) {
          try {
            const completedTasks = []
            const failedTasks = []

            for (const chore of selectedData) {
              try {
                await MarkChoreComplete(
                  chore.id,
                  impersonatedUser
                    ? { completedBy: impersonatedUser.userId }
                    : null,
                  null,
                  null,
                )
                completedTasks.push(chore)
              } catch (error) {
                failedTasks.push(chore)
              }
            }

            if (completedTasks.length > 0) {
              showSuccess({
                title: '✅ Tasks Completed',
                message: `Successfully completed ${completedTasks.length} task${completedTasks.length > 1 ? 's' : ''}.`,
              })
            }

            if (failedTasks.length > 0) {
              showError({
                title: 'Some Tasks Failed',
                message: `${failedTasks.length} task${failedTasks.length > 1 ? 's' : ''} could not be completed.`,
              })
            }

            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: 'Bulk Complete Failed',
              message: 'An unexpected error occurred. Please try again.',
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }, [
    getSelectedChoresData,
    impersonatedUser,
    showSuccess,
    showError,
    refetchChores,
    clearSelection,
    setConfirmModelConfig,
  ])

  const handleBulkArchive = useCallback(async () => {
    const selectedData = getSelectedChoresData(chores)
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: 'Archive Tasks',
      confirmText: 'Archive',
      cancelText: 'Cancel',
      message: `Archive ${selectedData.length} task${selectedData.length > 1 ? 's' : ''}?`,
      onClose: async isConfirmed => {
        if (isConfirmed === true) {
          try {
            const archivedTasks = []
            const failedTasks = []
            for (const chore of selectedData) {
              try {
                await new Promise((resolve, reject) => {
                  archiveChore.mutate(chore.id, {
                    onSuccess: data => {
                      archivedTasks.push(data)
                      setChores(prev => prev.filter(c => c.id !== chore.id))
                      setFilteredChores(prev =>
                        prev.filter(c => c.id !== chore.id),
                      )
                      resolve(data)
                    },
                    onError: error => {
                      failedTasks.push(chore)
                      reject(error)
                    },
                  })
                })
              } catch (error) {}
            }
            if (archivedTasks.length > 0) {
              showSuccess({
                title: '📦 Tasks Archived',
                message: `Successfully archived ${archivedTasks.length} task${archivedTasks.length > 1 ? 's' : ''}.`,
              })
            }
            if (failedTasks.length > 0) {
              showError({
                title: 'Some Tasks Failed',
                message: `${failedTasks.length} task${failedTasks.length > 1 ? 's' : ''} could not be archived.`,
              })
            }
            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: 'Bulk Archive Failed',
              message: 'An unexpected error occurred. Please try again.',
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }, [
    getSelectedChoresData,
    archiveChore,
    setChores,
    setFilteredChores,
    showSuccess,
    showError,
    refetchChores,
    clearSelection,
    setConfirmModelConfig,
  ])

  const handleBulkDelete = useCallback(async () => {
    const selectedData = getSelectedChoresData(chores)
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: 'Delete Tasks',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      message: `Delete ${selectedData.length} task${selectedData.length > 1 ? 's' : ''}?\n\nThis action cannot be undone.`,
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
                title: '🗑️ Tasks Deleted',
                message: `Successfully deleted ${deletedTasks.length} task${deletedTasks.length > 1 ? 's' : ''}.`,
              })

              const deletedIds = new Set(deletedTasks.map(c => c.id))
              const newChores = chores.filter(c => !deletedIds.has(c.id))
              const newFilteredChores = filteredChores.filter(
                c => !deletedIds.has(c.id),
              )
              setChores(newChores)
              setFilteredChores(newFilteredChores)
            }

            if (failedTasks.length > 0) {
              showError({
                title: 'Some Tasks Failed',
                message: `${failedTasks.length} task${failedTasks.length > 1 ? 's' : ''} could not be deleted.`,
              })
            }
            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: 'Bulk Delete Failed',
              message: 'An unexpected error occurred. Please try again.',
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }, [
    getSelectedChoresData,
    chores,
    filteredChores,
    setChores,
    setFilteredChores,
    showSuccess,
    showError,
    refetchChores,
    clearSelection,
    setConfirmModelConfig,
  ])

  const handleBulkSkip = useCallback(async () => {
    const selectedData = getSelectedChoresData(chores)
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: 'Skip Tasks',
      confirmText: 'Skip',
      cancelText: 'Cancel',
      message: `Skip ${selectedData.length} task${selectedData.length > 1 ? 's' : ''} to next due date?`,
      onClose: async isConfirmed => {
        if (isConfirmed === true) {
          try {
            const skippedTasks = []
            const failedTasks = []

            for (const chore of selectedData) {
              try {
                await SkipChore(chore.id)
                skippedTasks.push(chore)
              } catch (error) {
                failedTasks.push(chore)
              }
            }

            if (skippedTasks.length > 0) {
              showSuccess({
                title: '⏭️ Tasks Skipped',
                message: `Successfully skipped ${skippedTasks.length} task${skippedTasks.length > 1 ? 's' : ''}.`,
                undoAction: async () => {
                  try {
                    for (const chore of skippedTasks) {
                      await UndoChoreAction(chore.id)
                    }
                    queryClient.invalidateQueries(['chores'])
                    showUndo({
                      title: 'Undo Successful',
                      message: `Undo skip for ${skippedTasks.length} task${skippedTasks.length > 1 ? 's' : ''}.`,
                    })
                  } catch (error) {
                    showError({
                      title: 'Undo Failed',
                      message: 'Unable to undo the action. Please try again.',
                    })
                  }
                },
              })
            }

            if (failedTasks.length > 0) {
              showError({
                title: 'Some Tasks Failed',
                message: `${failedTasks.length > 1 ? 's' : ''} could not be skipped.`,
              })
            }

            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: 'Bulk Skip Failed',
              message: 'An unexpected error occurred. Please try again.',
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }, [
    getSelectedChoresData,
    showSuccess,
    showError,
    showUndo,
    refetchChores,
    clearSelection,
    setConfirmModelConfig,
  ])

  return {
    handleChoreAction,
    handleChangeDueDate,
    handleCompleteWithPastDate,
    handleAssigneeChange,
    handleCompleteWithNote,
    handleNudge,
    handleBulkComplete,
    handleBulkArchive,
    handleBulkDelete,
    handleBulkSkip,
  }
}
