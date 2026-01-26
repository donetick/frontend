import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useArchiveChore, useDeleteChores } from '../../../queries/ChoreQueries'
import { usePauseChore, useStartChore } from '../../../queries/TimeQueries'
import {
  ApproveChore,
  DeleteChore,
  MarkChoreComplete,
  NudgeChore,
  RejectChore,
  SkipChore,
  UndoChoreAction,
  UpdateChoreAssignee,
  UpdateDueDate,
} from '../../../utils/Fetcher'

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
  const startChore = useStartChore()
  const pauseChore = usePauseChore()

  const updateChoreInState = useCallback(
    (updatedChore, event) => {
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

      queryClient.invalidateQueries({ queryKey: ['chores'] })

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
                refetchChores()
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
          message: 'The task has been archived and hidden from the active list.',
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
    [chores, filteredChores, setChores, setFilteredChores, queryClient, showSuccess, showError, showWarning, showUndo, refetchChores],
  )

  const handleChoreAction = useCallback(
    async (action, chore, extraData = {}) => {
      switch (action) {
        case 'complete':
          try {
            const response = await MarkChoreComplete(
              chore.id,
              impersonatedUser ? { completedBy: impersonatedUser.userId } : null,
              null,
              null,
            )
            if (response.ok) {
              const data = await response.json()
              updateChoreInState(data.res, 'completed')
            }
          } catch (error) {
            if (error?.queued) {
              showError({
                title: 'Update Failed',
                message: 'Request will be reattempt when you are online',
              })
            } else {
              showError({
                title: 'Failed to update',
                message: error,
              })
            }
          }
          break

        case 'start':
          startChore.mutate(chore.id, {
            onSuccess: async res => {
              const data = await res.json()
              const newChore = { ...chore, status: data.res.status }
              updateChoreInState(newChore, 'started')
            },
            onError: error => {
              showError({
                title: 'Failed to start',
                message: error.message || 'Unable to start chore',
              })
            },
          })
          break

        case 'pause':
          pauseChore.mutate(chore.id, {
            onSuccess: async res => {
              const data = await res.json()
              const newChore = { ...chore, status: data.res.status }
              updateChoreInState(newChore, 'paused')
            },
            onError: error => {
              showError({
                title: 'Failed to pause',
                message: error.message || 'Unable to pause chore',
              })
            },
          })
          break

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
                    showSuccess({
                      title: 'Task Deleted',
                      message: 'The task has been deleted successfully.',
                    })
                  }
                } catch (error) {
                  showError({
                    title: 'Failed to delete',
                    message: error,
                  })
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
                  updateChoreInState(data, 'archive')
                  resolve(data)
                },
                onError: error => {
                  showError({
                    title: 'Failed to archive',
                    message: error.message || 'Unable to archive chore',
                  })
                  reject(error)
                },
              })
            })
          } catch (error) {
          }
          break

        case 'skip':
          try {
            const response = await SkipChore(chore.id)
            if (response.ok) {
              const data = await response.json()
              updateChoreInState(data.res, 'skipped')
            }
          } catch (error) {
            showError({
              title: 'Failed to skip',
              message: error,
            })
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
              showError({
                title:
                  extraData.date === null
                    ? 'Failed to remove due date'
                    : 'Failed to reschedule',
                message: error.message || 'Unable to update due date',
              })
            }
          } else {
            openModal(action, chore, extraData)
          }
          break

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
      startChore,
      pauseChore,
    ],
  )

  const handleChangeDueDate = useCallback(
    newDate => {
      if (!modalChore) return
      UpdateDueDate(modalChore.id, newDate).then(response => {
        if (response.ok) {
          response.json().then(data => {
            const newChore = modalChore
            newChore.nextDueDate = newDate
            updateChoreInState(newChore, 'rescheduled')
          })
        }
      })
      closeModal()
    },
    [modalChore, updateChoreInState, closeModal],
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
    const selectedData = getSelectedChoresData()
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
  }, [getSelectedChoresData, impersonatedUser, showSuccess, showError, refetchChores, clearSelection, setConfirmModelConfig])

  const handleBulkArchive = useCallback(async () => {
    const selectedData = getSelectedChoresData()
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
              } catch (error) {
              }
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
  }, [getSelectedChoresData, archiveChore, setChores, setFilteredChores, showSuccess, showError, refetchChores, clearSelection, setConfirmModelConfig])

  const handleBulkDelete = useCallback(async () => {
    const selectedData = getSelectedChoresData()
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
  }, [getSelectedChoresData, chores, filteredChores, setChores, setFilteredChores, showSuccess, showError, refetchChores, clearSelection, setConfirmModelConfig])

  const handleBulkSkip = useCallback(async () => {
    const selectedData = getSelectedChoresData()
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
  }, [getSelectedChoresData, showSuccess, showError, refetchChores, clearSelection, setConfirmModelConfig])

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
