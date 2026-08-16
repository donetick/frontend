import { useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

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
  UpdateChorePriority,
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

const plural = count => (count === 1 ? '' : 's')
const taskCount = count => `${count} task${plural(count)}`

// "No specific time" is stored as end of day, and it has to be exactly
// 23:59:59 — that stamp is what ChoreEdit writes and what the task card checks
// to render "Today" rather than "Today 11:59 PM". Rebuilding from HH:mm alone
// would land on :00 seconds and lose that meaning.
const END_OF_DAY = '23:59'
const atTimeOfDay = (date, time) =>
  (!time || time === END_OF_DAY
    ? moment(date, 'YYYY-MM-DD').endOf('day')
    : moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm')
  ).toISOString()

// Fetcher calls resolve with a Response even on 4xx/5xx, so a bulk run has to
// check explicitly or it will report failures as successes.
const expectOk = async request => {
  const response = await request
  if (!response?.ok) throw new Error('Request failed')
  return response
}

export const useChoreActions = ({
  chores,
  clearSelection,
  closeModal,
  filteredChores,
  getSelectedChoresData,
  impersonatedUser,
  modalChore,
  openModal,
  refetchChores,
  setChores,
  setConfirmModelConfig,
  setFilteredChores,
  showError,
  showSuccess,
  showUndo,
  showWarning,
  userProfile,
}) => {
  const { t } = useTranslation('chores')
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
                  title: t('choreView.undoSuccessful'),
                  message: undoMessages[event],
                })
              } else {
                throw new Error(t('choreView.unableUndo'))
              }
            } catch (error) {
              showError({
                title: t('choreView.undoFailed'),
                message: t('choreView.undoFailedMessage'),
              })
            }
          },
        })
        return
      }

      const notifications = {
        rescheduled: {
          type: 'success',
          title: t('actions.rescheduledTitle'),
          message: t('actions.rescheduledMessage'),
        },
        'due-date-removed': {
          type: 'success',
          title: t('actions.unplannedTitle'),
          message: t('actions.unplannedMessage'),
        },
        unarchive: {
          type: 'success',
          title: t('archived.restoredTitle'),
          message: t('archived.restoredMsg'),
        },
        archive: {
          type: 'success',
          title: t('actions.archivedTitle'),
          message:
            'The task has been archived and hidden from the active list.',
        },
        started: {
          type: 'success',
          title: t('actions.startedTitle'),
          message: t('actions.startedMessage'),
        },
        paused: {
          type: 'warning',
          title: t('actions.pausedTitle'),
          message: t('actions.pausedMessage'),
        },
        deleted: {
          type: 'success',
          title: t('archived.deletedTitle'),
          message: t('actions.deletedMessage'),
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
                message: t('actions.undoable.completed'),
                undoAction: async () => {
                  try {
                    const undoResponse = await UndoChoreAction(chore.id)
                    if (undoResponse.ok) {
                      queryClient.invalidateQueries(['chores'])
                      showUndo({
                        title: t('choreView.undoSuccessful'),
                        message: t('choreView.taskCompletionUndone'),
                      })
                    } else throw new Error(t('choreView.unableUndo'))
                  } catch {
                    showError({
                      title: t('choreView.undoFailed'),
                      message: t('choreView.undoFailedMessage'),
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
                title: t('actions.completionPending'),
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
                title: t('actions.failCompleteTitle'),
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
                title: t('actions.failStartTitle'),
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
                title: t('actions.failPauseTitle'),
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
              title: t('actions.failApproveTitle'),
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
              title: t('actions.failRejectTitle'),
              message: error.message || 'Unable to reject chore',
            })
          }
          break

        case 'delete':
          setConfirmModelConfig({
            isOpen: true,
            title: t('deleteChore'),
            confirmText: t('archived.delete'),
            cancelText: t('choreView.cancel'),
            message: t('edit.deleteConfirm'),
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
                      title: t('archived.deletedTitle'),
                      message: t('actions.deletedMessageLong'),
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
                      title: t('actions.failDeleteTitle'),
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
                      title: t('actions.failArchiveTitle'),
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
                      title: t('choreView.restoreFailed'),
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
                title: t('actions.failSkipTitle'),
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
                title: t('actions.movedTitle'),
                message: `Task moved to ${project?.name || 'Default Project'}.`,
              })
            }
          } catch (error) {
            showError({
              title: t('actions.failMoveTitle'),
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
            title: t('actions.failRescheduleTitle'),
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
            title: t('actions.nudgeSentTitle'),
            message: data.message || 'Nudge sent successfully',
          })
        } else {
          throw new Error(t('actions.nudgeFailed'))
        }
      } catch (error) {
        showError({
          title: t('actions.failNudgeTitle'),
          message: error.message || 'Unable to send nudge at this time',
        })
      } finally {
        closeModal()
      }
    },
    [showSuccess, showError, closeModal],
  )

  // ── bulk operations ────────────────────────────────────────────────────────
  //
  // Every bulk action is the same shape: optionally confirm, apply per chore,
  // tally what worked, tell the user, refetch, drop the selection. `runBulk`
  // owns that shape so each action only describes what it does to one chore.
  //
  // Failures are best-effort and partial: a chore that fails leaves the others
  // applied, and the toast says how many of each.

  const patchLocalChores = useCallback(
    (ids, patch) => {
      const idSet = new Set(ids)
      const apply = list =>
        list.map(chore =>
          idSet.has(chore.id)
            ? {
                ...chore,
                ...(typeof patch === 'function' ? patch(chore) : patch),
              }
            : chore,
        )
      setChores(apply)
      setFilteredChores(apply)
    },
    [setChores, setFilteredChores],
  )

  const removeLocalChores = useCallback(
    ids => {
      const idSet = new Set(ids)
      const drop = list => list.filter(chore => !idSet.has(chore.id))
      setChores(drop)
      setFilteredChores(drop)
    },
    [setChores, setFilteredChores],
  )

  const runBulk = useCallback(
    async ({
      buildUndo,
      // { title, confirmText, message } — omitted when the picker the user
      // just used is itself the confirmation.
      confirm,
      // "completed", "rescheduled", … — reads as `2 tasks could not be ${verb}.`
      // t() key output for the "the whole batch blew up" toast title.
      failedTitle,
      failureVerb,
      onSucceeded,
      perChore,
      successTitle,
      // "Completed", "Rescheduled", … — reads as `${verb} 3 tasks.`
      successVerb,
      targets,
    }) => {
      if (!targets || targets.length === 0) return

      const execute = async () => {
        const succeeded = []
        const failed = []

        for (const chore of targets) {
          try {
            await perChore(chore)
            succeeded.push(chore)
          } catch (error) {
            failed.push(chore)
          }
        }

        if (succeeded.length > 0) {
          onSucceeded?.(succeeded)
          showSuccess({
            title: successTitle,
            message: `${successVerb} ${taskCount(succeeded.length)}.`,
            ...(buildUndo ? { undoAction: buildUndo(succeeded) } : {}),
          })
        }

        if (failed.length > 0) {
          showError({
            title: t('archived.someFailedTitle'),
            message: `${taskCount(failed.length)} could not be ${failureVerb}.`,
          })
        }

        refetchChores()
        clearSelection()
      }

      if (!confirm) {
        try {
          await execute()
        } catch (error) {
          showError({
            title: failedTitle || `Bulk ${failureVerb} failed`,
            message: t('archived.unexpectedError'),
          })
        }
        return
      }

      setConfirmModelConfig({
        isOpen: true,
        cancelText: t('choreView.cancel'),
        ...confirm,
        onClose: async isConfirmed => {
          setConfirmModelConfig({})
          if (isConfirmed !== true) return
          try {
            await execute()
          } catch (error) {
            showError({
              title: failedTitle || `Bulk ${failureVerb} failed`,
              message: t('archived.unexpectedError'),
            })
          }
        },
      })
    },
    [
      showSuccess,
      showError,
      refetchChores,
      clearSelection,
      setConfirmModelConfig,
    ],
  )

  const handleBulkComplete = useCallback(async () => {
    const targets = getSelectedChoresData(chores)
    runBulk({
      targets,
      confirm: {
        title: t('actions.bulk.completeTitle'),
        confirmText: t('list.complete'),
        message: `Mark ${taskCount(targets.length)} as completed?`,
      },
      perChore: chore =>
        expectOk(
          MarkChoreComplete(
            chore.id,
            impersonatedUser ? { completedBy: impersonatedUser.userId } : null,
            null,
            null,
          ),
        ),
      successTitle: t('actions.bulk.completedTitle'),
      successVerb: 'Completed',
      failureVerb: 'completed',
      failedTitle: t('actions.bulk.completeFailedTitle'),
    })
  }, [getSelectedChoresData, chores, impersonatedUser, runBulk])

  const handleBulkSkip = useCallback(async () => {
    const targets = getSelectedChoresData(chores)
    runBulk({
      targets,
      confirm: {
        title: t('actions.bulk.skipTitle'),
        confirmText: t('multiToolbar.skip'),
        message: `Skip ${taskCount(targets.length)} to next due date?`,
      },
      perChore: chore => expectOk(SkipChore(chore.id)),
      successTitle: t('actions.bulk.skippedTitle'),
      successVerb: 'Skipped',
      failureVerb: 'skipped',
      failedTitle: t('actions.bulk.skipFailedTitle'),
      buildUndo: succeeded => async () => {
        try {
          for (const chore of succeeded) {
            await UndoChoreAction(chore.id)
          }
          queryClient.invalidateQueries(['chores'])
          showUndo({
            title: t('choreView.undoSuccessful'),
            message: `Undo skip for ${taskCount(succeeded.length)}.`,
          })
        } catch (error) {
          showError({
            title: t('choreView.undoFailed'),
            message: t('choreView.undoFailedMessage'),
          })
        }
      },
    })
  }, [getSelectedChoresData, chores, runBulk, queryClient, showUndo, showError])

  const handleBulkArchive = useCallback(async () => {
    const targets = getSelectedChoresData(chores)
    runBulk({
      targets,
      confirm: {
        title: t('actions.bulk.archiveTitle'),
        confirmText: t('actionMenu.archive'),
        message: `Archive ${taskCount(targets.length)}?`,
      },
      perChore: chore =>
        new Promise((resolve, reject) => {
          archiveChore.mutate(chore.id, {
            onSuccess: resolve,
            onError: reject,
          })
        }),
      successTitle: t('actions.bulk.archivedTitle'),
      successVerb: 'Archived',
      failureVerb: 'archived',
      failedTitle: t('actions.bulk.archiveFailedTitle'),
      onSucceeded: succeeded => removeLocalChores(succeeded.map(c => c.id)),
    })
  }, [getSelectedChoresData, chores, runBulk, archiveChore, removeLocalChores])

  const handleBulkDelete = useCallback(async () => {
    const targets = getSelectedChoresData(chores)
    runBulk({
      targets,
      confirm: {
        title: t('actions.bulk.deleteTitle'),
        confirmText: t('archived.delete'),
        message: `Delete ${taskCount(targets.length)}?\n\nThis action cannot be undone.`,
      },
      perChore: chore => expectOk(DeleteChore(chore.id)),
      successTitle: t('archived.deletedBulkTitle'),
      successVerb: 'Deleted',
      failureVerb: 'deleted',
      failedTitle: t('archived.bulkDeleteFailTitle'),
      onSucceeded: succeeded => removeLocalChores(succeeded.map(c => c.id)),
    })
  }, [getSelectedChoresData, chores, runBulk, removeLocalChores])

  const handleBulkMoveToProject = useCallback(
    async project => {
      const projectId = project?.id ?? null
      runBulk({
        targets: getSelectedChoresData(chores),
        perChore: chore => expectOk(SaveChore({ ...chore, projectId })),
        successTitle: 'Tasks Moved',
        successVerb: `Moved to ${project?.name || 'Default Project'} —`,
        failureVerb: 'moved',
        onSucceeded: succeeded =>
          patchLocalChores(
            succeeded.map(c => c.id),
            { projectId },
          ),
      })
    },
    [getSelectedChoresData, chores, runBulk, patchLocalChores],
  )

  // Takes the picker's { dueDateOnly, dueTime, useCustomTime } parts, or null to
  // unplan. Moving a batch is a date operation: each task keeps the time of day
  // it was already due at, so "next week 5am" moved to tomorrow becomes
  // "tomorrow 5am", and a task with no specific time stays at anytime. Only a
  // time the user explicitly picked overrides that, for the whole selection.
  const handleBulkDueDate = useCallback(
    async parts => {
      const clearing = !parts?.dueDateOnly

      const dueDateFor = chore => {
        if (clearing) return null
        if (parts.useCustomTime && parts.dueTime) {
          return atTimeOfDay(parts.dueDateOnly, parts.dueTime)
        }
        // A task with no due date yet has no hour to carry over, so it lands on
        // end of day like anything else without a specific time.
        const current = moment(chore.nextDueDate)
        return atTimeOfDay(
          parts.dueDateOnly,
          chore.nextDueDate && current.isValid()
            ? current.format('HH:mm')
            : null,
        )
      }

      runBulk({
        targets: getSelectedChoresData(chores),
        perChore: chore => expectOk(UpdateDueDate(chore.id, dueDateFor(chore))),
        successTitle: clearing ? 'Due Date Removed' : 'Tasks Scheduled',
        successVerb: clearing ? 'Unplanned' : 'Rescheduled',
        failureVerb: clearing ? 'unplanned' : 'rescheduled',
        onSucceeded: succeeded =>
          patchLocalChores(
            succeeded.map(c => c.id),
            chore => ({
              nextDueDate: dueDateFor(chore),
            }),
          ),
      })
    },
    [getSelectedChoresData, chores, runBulk, patchLocalChores],
  )

  const handleBulkAssignee = useCallback(
    async assigneeId => {
      runBulk({
        targets: getSelectedChoresData(chores),
        perChore: chore => expectOk(UpdateChoreAssignee(chore.id, assigneeId)),
        successTitle: 'Tasks Reassigned',
        successVerb: 'Reassigned',
        failureVerb: 'reassigned',
        onSucceeded: succeeded =>
          patchLocalChores(
            succeeded.map(c => c.id),
            { assignedTo: assigneeId },
          ),
      })
    },
    [getSelectedChoresData, chores, runBulk, patchLocalChores],
  )

  const handleBulkPriority = useCallback(
    async priority => {
      runBulk({
        targets: getSelectedChoresData(chores),
        perChore: chore => expectOk(UpdateChorePriority(chore.id, priority)),
        successTitle: 'Priority Updated',
        successVerb: 'Updated priority on',
        failureVerb: 'updated',
        onSucceeded: succeeded =>
          patchLocalChores(
            succeeded.map(c => c.id),
            { priority },
          ),
      })
    },
    [getSelectedChoresData, chores, runBulk, patchLocalChores],
  )

  // Add/remove rather than replace: a mixed selection has no single "current"
  // label set, and replacing would silently drop labels the user never saw.
  // There is no per-label endpoint, so this goes through a full chore save.
  const handleBulkLabels = useCallback(
    async (label, mode) => {
      if (!label) return
      const selected = getSelectedChoresData(chores)
      const nextLabelsFor = chore => {
        const current = chore.labelsV2 || []
        return mode === 'add'
          ? [...current, label]
          : current.filter(l => l.id !== label.id)
      }

      // Chores already in the desired state aren't worth a round trip, and
      // counting them would inflate the toast.
      const targets = selected.filter(chore => {
        const hasLabel = (chore.labelsV2 || []).some(l => l.id === label.id)
        return mode === 'add' ? !hasLabel : hasLabel
      })

      if (targets.length === 0) {
        showSuccess({
          title: 'No Changes',
          message:
            mode === 'add'
              ? `Every selected task already has "${label.name}".`
              : `No selected task has "${label.name}".`,
        })
        clearSelection()
        return
      }

      runBulk({
        targets,
        perChore: chore =>
          expectOk(SaveChore({ ...chore, labelsV2: nextLabelsFor(chore) })),
        successTitle: mode === 'add' ? 'Label Added' : 'Label Removed',
        successVerb:
          mode === 'add'
            ? `Added "${label.name}" to`
            : `Removed "${label.name}" from`,
        failureVerb: 'updated',
        onSucceeded: succeeded =>
          patchLocalChores(
            succeeded.map(c => c.id),
            chore => ({
              labelsV2: nextLabelsFor(chore),
            }),
          ),
      })
    },
    [
      getSelectedChoresData,
      chores,
      runBulk,
      patchLocalChores,
      showSuccess,
      clearSelection,
    ],
  )

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
    handleBulkMoveToProject,
    handleBulkDueDate,
    handleBulkAssignee,
    handleBulkPriority,
    handleBulkLabels,
  }
}
