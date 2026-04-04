import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useArchiveChore } from '../../../queries/ChoreQueries'
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
  const { t } = useTranslation(['chores', 'common'])
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
        completed: t('chores:actionFeedback.undoable.completed'),
        approved: t('chores:actionFeedback.undoable.approved'),
        rejected: t('chores:actionFeedback.undoable.rejected'),
        skipped: t('chores:actionFeedback.undoable.skipped'),
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
                  completed: t('chores:actionFeedback.undoDone.completed'),
                  approved: t('chores:actionFeedback.undoDone.approved'),
                  rejected: t('chores:actionFeedback.undoDone.rejected'),
                  skipped: t('chores:actionFeedback.undoDone.skipped'),
                }
                showUndo({
                  title: t('chores:actionFeedback.undoSuccessTitle'),
                  message: undoMessages[event],
                })
              } else {
                throw new Error('Failed to undo')
              }
            } catch (error) {
              showError({
                title: t('chores:actionFeedback.undoFailedTitle'),
                message: t('chores:actionFeedback.undoFailedMessage'),
              })
            }
          },
        })
        return
      }

      const notifications = {
        rescheduled: {
          type: 'success',
          title: t('chores:actionFeedback.notifications.rescheduledTitle'),
          message: t('chores:actionFeedback.notifications.rescheduledMessage'),
        },
        'due-date-removed': {
          type: 'success',
          title: t('chores:actionFeedback.notifications.dueDateRemovedTitle'),
          message: t('chores:actionFeedback.notifications.dueDateRemovedMessage'),
        },
        unarchive: {
          type: 'success',
          title: t('chores:actionFeedback.notifications.restoredTitle'),
          message: t('chores:actionFeedback.notifications.restoredMessage'),
        },
        archive: {
          type: 'success',
          title: t('chores:actionFeedback.notifications.archivedTitle'),
          message: t('chores:actionFeedback.notifications.archivedMessage'),
        },
        started: {
          type: 'success',
          title: t('chores:actionFeedback.notifications.startedTitle'),
          message: t('chores:actionFeedback.notifications.startedMessage'),
        },
        paused: {
          type: 'warning',
          title: t('chores:actionFeedback.notifications.pausedTitle'),
          message: t('chores:actionFeedback.notifications.pausedMessage'),
        },
        deleted: {
          type: 'success',
          title: t('chores:actionFeedback.notifications.deletedTitle'),
          message: t('chores:actionFeedback.notifications.deletedMessage'),
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
          // 1. Instantly hide the chore from the UI and Cache
          setChores(prev => prev.filter(c => c.id !== chore.id))
          setFilteredChores(prev => prev.filter(c => c.id !== chore.id))

          queryClient.setQueriesData({ queryKey: ['chores'] }, oldData => {
            if (!oldData || !oldData.res) return oldData;
            return {
              ...oldData,
              res: oldData.res.filter(c => c.id !== chore.id),
            }
          });

          try {
            const response = await MarkChoreComplete(
              chore.id,
              impersonatedUser ? { completedBy: impersonatedUser.userId } : null,
              null,
              null,
            )
            if (response.ok) {
              // 2. Show the success notification with Undo
              showSuccess({
                message: 'Task completed',
                undoAction: async () => {
                  try {
                    const undoResponse = await UndoChoreAction(chore.id)
                    if (undoResponse.ok) {
                      refetchChores()
                      showUndo({
                        title: 'Undo Successful',
                        message: 'Task completion has been undone.',
                      })
                    } else throw new Error('Failed to undo')
                  } catch (error) {
                    showError({
                      title: 'Undo Failed',
                      message: 'Unable to undo the action. Please try again.',
                    })
                  }
                },
              })

              // 3. Fetch the fresh active list from the server silently
              // (This brings in the next occurrence if recurring, without showing the completed one)
              queryClient.invalidateQueries({ queryKey: ['chores'] })
            } else {
              refetchChores() // Network failed, revert to truth
            }
          } catch (error) {
            refetchChores() // Network failed, revert to truth
            if (error?.queued) {
              showError({
                title: t('chores:actionFeedback.errors.failedToUpdate'),
                message: t('chores:actionFeedback.errors.offlineRetry'),
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
                title: t('chores:actionFeedback.errors.failedToStart'),
                message:
                  error.message || t('chores:actionFeedback.errors.unableToStart'),
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
                title: t('chores:actionFeedback.errors.failedToPause'),
                message:
                  error.message || t('chores:actionFeedback.errors.unableToPause'),
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
              title: t('chores:actionFeedback.errors.failedToApprove'),
              message:
                error.message ||
                t('chores:actionFeedback.errors.unableToApprove'),
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
              title: t('chores:actionFeedback.errors.failedToReject'),
              message:
                error.message ||
                t('chores:actionFeedback.errors.unableToReject'),
            })
          }
          break

        case 'delete':
          setConfirmModelConfig({
            isOpen: true,
            title: t('chores:actionFeedback.errors.deleteTitle'),
            confirmText: t('common:actions.delete'),
            cancelText: t('common:actions.cancel'),
            message: t('chores:actionFeedback.errors.deleteMessage'),
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
                    updateChoreInState(chore.id, 'deleted')
                    setFilteredChores(newFilteredChores)
                    showSuccess({
                      title: t('chores:actionFeedback.notifications.deletedTitle'),
                      message: t('chores:actionFeedback.notifications.deletedMessage'),
                    })
                  }
                } catch (error) {
                  showError({
                    title: t('chores:actionFeedback.errors.deleteFailed'),
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
                    title: t('chores:actionFeedback.errors.failedToArchive'),
                    message:
                      error.message ||
                      t('chores:actionFeedback.errors.unableToArchive'),
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
              title: t('chores:actionFeedback.errors.failedToSkip'),
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
                    ? t('chores:actionFeedback.errors.failedRemoveDueDate')
                    : t('chores:actionFeedback.errors.failedReschedule'),
                message:
                  error.message ||
                  t('chores:actionFeedback.errors.unableUpdateDueDate'),
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
            title: t('chores:actionFeedback.nudgeSentTitle'),
            message: data.message || t('chores:actionFeedback.nudgeSentMessage'),
          })
        } else {
          throw new Error('Failed to send nudge')
        }
      } catch (error) {
        showError({
          title: t('chores:actionFeedback.errors.nudgeFailedTitle'),
          message:
            error.message || t('chores:actionFeedback.errors.nudgeFailedMessage'),
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
      title: t('chores:actionFeedback.bulk.completeTitle'),
      confirmText: t('common:actions.complete', { defaultValue: 'Complete' }),
      cancelText: t('common:actions.cancel'),
      message: t('chores:actionFeedback.bulk.completeConfirm', {
        count: selectedData.length,
      }),
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
                title: t('chores:actionFeedback.bulk.completeSuccessTitle'),
                message: t('chores:actionFeedback.bulk.completeSuccess', {
                  count: completedTasks.length,
                }),
              })
            }

            if (failedTasks.length > 0) {
              showError({
                title: t('chores:actionFeedback.bulk.someFailedTitle'),
                message: t('chores:actionFeedback.bulk.completeFailed', {
                  count: failedTasks.length,
                }),
              })
            }

            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: t('chores:actionFeedback.bulk.completeUnexpectedTitle'),
              message: t('chores:main.unexpectedError'),
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }, [getSelectedChoresData, impersonatedUser, showSuccess, showError, refetchChores, clearSelection, setConfirmModelConfig])

  const handleBulkArchive = useCallback(async () => {
    const selectedData = getSelectedChoresData(chores)
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: t('chores:actionFeedback.bulk.archiveTitle'),
      confirmText: t('common:actions.archive'),
      cancelText: t('common:actions.cancel'),
      message: t('chores:actionFeedback.bulk.archiveConfirm', {
        count: selectedData.length,
      }),
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
                title: t('chores:actionFeedback.bulk.archiveSuccessTitle'),
                message: t('chores:actionFeedback.bulk.archiveSuccess', {
                  count: archivedTasks.length,
                }),
              })
            }
            if (failedTasks.length > 0) {
              showError({
                title: t('chores:actionFeedback.bulk.someFailedTitle'),
                message: t('chores:actionFeedback.bulk.archiveFailed', {
                  count: failedTasks.length,
                }),
              })
            }
            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: t('chores:actionFeedback.bulk.archiveUnexpectedTitle'),
              message: t('chores:main.unexpectedError'),
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }, [getSelectedChoresData, archiveChore, setChores, setFilteredChores, showSuccess, showError, refetchChores, clearSelection, setConfirmModelConfig])

  const handleBulkDelete = useCallback(async () => {
    const selectedData = getSelectedChoresData(chores)
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: t('chores:actionFeedback.bulk.deleteTitle'),
      confirmText: t('common:actions.delete'),
      cancelText: t('common:actions.cancel'),
      message: t('chores:actionFeedback.bulk.deleteConfirm', {
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
              const newChores = chores.filter(c => !deletedIds.has(c.id))
              const newFilteredChores = filteredChores.filter(
                c => !deletedIds.has(c.id),
              )
              setChores(newChores)
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
            refetchChores()
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
  }, [getSelectedChoresData, chores, filteredChores, setChores, setFilteredChores, showSuccess, showError, refetchChores, clearSelection, setConfirmModelConfig])

  const handleBulkSkip = useCallback(async () => {
    const selectedData = getSelectedChoresData(chores)
    if (selectedData.length === 0) return

    setConfirmModelConfig({
      isOpen: true,
      title: t('common:actions.skip'),
      confirmText: t('common:actions.skip'),
      cancelText: t('common:actions.cancel'),
      message: t('chores:actions.skipToNextDueDate') + ` (${selectedData.length})`,
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
                title: t('chores:actionFeedback.undoable.skipped'),
                message: t('chores:actionFeedback.undoable.skipped'),
                undoAction: async () => {
                  try {
                    for (const chore of skippedTasks) {
                      await UndoChoreAction(chore.id)
                    }
                    refetchChores()
                    showUndo({
                      title: t('chores:actionFeedback.undoSuccessTitle'),
                      message: t('chores:actionFeedback.undoDone.skipped'),
                    })
                  } catch (error) {
                    showError({
                      title: t('chores:actionFeedback.undoFailedTitle'),
                      message: t('chores:actionFeedback.undoFailedMessage'),
                    })
                  }
                },
              })
            }

            if (failedTasks.length > 0) {
              showError({
                title: t('chores:actionFeedback.bulk.someFailedTitle'),
                message: t('chores:main.unexpectedError'),
              })
            }

            refetchChores()
            clearSelection()
          } catch (error) {
            showError({
              title: t('common:actions.skip'),
              message: t('chores:main.unexpectedError'),
            })
          }
        }
        setConfirmModelConfig({})
      },
    })
  }, [getSelectedChoresData, showSuccess, showError, showUndo, refetchChores, clearSelection, setConfirmModelConfig])

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
