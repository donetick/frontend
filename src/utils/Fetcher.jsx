import { shouldUseLocalFirstStore } from '../data/accountLocalFirst'
import { isLocalMode } from '../data/appMode'
import { localResponse } from '../data/localResponse'
import { choreRepo } from '../data/repositories/choreRepo'
import { filterRepo } from '../data/repositories/filterRepo'
import { labelRepo } from '../data/repositories/labelRepo'
import { projectRepo } from '../data/repositories/projectRepo'
import { apiClient } from './ApiClient'

// Migration helpers to maintain compatibility with existing code
const Fetch = async (endpoint, options = {}) => {
  // base on options.method, call the appropriate method on apiClient:
  switch (options.method) {
    case 'GET':
      return apiClient.get(endpoint, options)
    case 'POST':
      return apiClient.post(endpoint, options.body, options)
    case 'PUT':
      return apiClient.put(endpoint, options.body, options)
    case 'DELETE':
      return apiClient.delete(endpoint, options)
    default:
      return apiClient.request(endpoint, options)
  }
}

const HEADERS = () => {
  return apiClient.getHeaders()
}

const apiManager = {
  getApiURL: () => apiClient.getApiURL(),
}

const createChore = userID => {
  return Fetch(`/chores/`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      createdBy: Number(userID),
    }),
  }).then(response => response.json())
}

const signUp = async (username, password, displayName, email) => {
  await apiClient.init(true)
  const baseURL = apiManager.getApiURL()
  return fetch(`${baseURL}/auth/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, displayName, email }),
  })
}

const UpdatePassword = async newPassword => {
  await apiClient.init(true)
  const baseURL = apiManager.getApiURL()
  return fetch(`${baseURL}/users/change_password`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ password: newPassword }),
  })
}

const login = async (username, password) => {
  await apiClient.init(true)
  const baseURL = apiManager.getApiURL()
  return fetch(`${baseURL}/auth/login`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

const logout = async () => {
  await apiClient.init(true)
  const baseURL = apiManager.getApiURL()
  const isNative =
    typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

  const config = {
    method: 'POST',
  }

  // Only use credentials for web, not for native apps
  if (!isNative) {
    config.credentials = 'include'
  }

  return fetch(`${baseURL}/auth/logout`, config)
}

const GetAllUsers = () => {
  return Fetch(`/users/`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const GetChoresNew = async includeArchived => {
  var url = `/chores/`
  if (includeArchived) {
    url += `?includeArchived=true`
  }

  const resp = await Fetch(url, {
    method: 'GET',
    headers: HEADERS(),
  })
  return resp.json()
}

const GetChores = () => {
  return Fetch(`/chores/`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const GetArchivedChores = () => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.archived().then(localResponse)
  }
  return Fetch(`/chores/archived`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const ArchiveChore = id => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.archive(id).then(localResponse)
  }
  return Fetch(`/chores/${id}/archive`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}
const UnArchiveChore = id => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.unarchive(id).then(localResponse)
  }
  return Fetch(`/chores/${id}/unarchive`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}

const GetChoreByID = id => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.get(id).then(localResponse)
  }
  return Fetch(`/chores/${id}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const GetChoreDetailById = id => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.get(id).then(localResponse)
  }
  return Fetch(`/chores/${id}/details`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const MarkChoreComplete = (id, body, completedDate, performer) => {
  if (isLocalMode()) {
    return choreRepo
      .complete(id, {
        completedDate,
        note: body?.note ?? null,
      })
      .then(result => {
        import('../service/FeedbackService')
          .then(({ recordTaskCompleted }) => recordTaskCompleted())
          .catch(() => {})
        return localResponse(result)
      })
  }

  var markChoreURL = `/chores/${id}/do`

  let completedDateFormated = ''
  if (completedDate) {
    completedDateFormated = `?completedDate=${new Date(
      completedDate,
    ).toISOString()}`
    markChoreURL += completedDateFormated
  }
  if (performer) {
    body.performer = Number(performer)
    if (completedDateFormated === '') {
      markChoreURL += `&performer=${performer}`
    } else {
      markChoreURL += `?performer=${performer}`
    }
  }

  return Fetch(markChoreURL, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(body),
  }).then(response => {
    if (response?.ok) {
      // Single choke point for completions, so queued offline completions are
      // counted once, when they sync.
      import('../service/FeedbackService')
        .then(({ recordTaskCompleted }) => recordTaskCompleted())
        .catch(() => {})
    }
    return response
  })
}

const StartChore = id => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.start(id).then(localResponse)
  }
  return Fetch(`/chores/${id}/start`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}

const PauseChore = id => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.pause(id).then(localResponse)
  }
  return Fetch(`/chores/${id}/pause`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}

const CompleteSubTask = (id, choreId, completedAt) => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo
      .setSubtaskCompletion(choreId, id, Boolean(completedAt))
      .then(localResponse)
  }
  var markChoreURL = `/chores/${choreId}/subtask`
  return Fetch(markChoreURL, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ completedAt, id, choreId }),
  })
}

const SkipChore = id => {
  if (isLocalMode()) {
    return choreRepo.skip(id).then(localResponse)
  }
  return Fetch(`/chores/${id}/skip`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

const ApproveChore = id => {
  return Fetch(`/chores/${id}/approve`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({}),
  })
}

const RejectChore = id => {
  return Fetch(`/chores/${id}/reject`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({}),
  })
}

const UndoChoreAction = id => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.undo(id).then(localResponse)
  }
  return Fetch(`/chores/${id}/undo`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({}),
  })
}

const NudgeChore = (id, { message, notifyAllAssignees }) => {
  return Fetch(`/chores/${id}/nudge`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      all_assignees: notifyAllAssignees,
      message: message || '',
    }),
  })
}

const UpdateChoreAssignee = (id, assignee) => {
  return Fetch(`/chores/${id}/assignee`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({
      assignee: Number(assignee),
      updatedAt: new Date().toISOString(),
    }),
  })
}

const CreateChore = chore => {
  return Fetch(`/chores/`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(chore),
  })
}

const DeleteChore = id => {
  if (isLocalMode()) {
    return choreRepo.remove(id).then(localResponse)
  }
  return Fetch(`/chores/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const SaveChore = chore => {
  if (isLocalMode()) {
    return choreRepo.save(chore).then(localResponse)
  }
  return Fetch(`/chores/`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(chore),
  })
}

const UpdateChorePriority = (id, priority) => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.save({ id, priority }).then(localResponse)
  }
  return Fetch(`/chores/${id}/priority `, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ priority: priority }),
  })
}
const GetChoreHistory = choreId => {
  return Fetch(`/chores/${choreId}/history`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const DeleteChoreHistory = (choreId, id) => {
  return Fetch(`/chores/${choreId}/history/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const UpdateChoreHistory = (choreId, id, choreHistory) => {
  return Fetch(`/chores/${choreId}/history/${id}`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(choreHistory),
  })
}

const GetAllCircleMembers = async () => {
  const resp = await Fetch(`/circles/members`, {
    method: 'GET',
    headers: HEADERS(),
  })
  return resp.json()
}

const UpdateMemberRole = async (memberId, role) => {
  return Fetch(`/circles/members/role`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ role, memberId }),
  })
}

const GetUserProfile = () => {
  return Fetch(`/users/profile`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetUserCircle = () => {
  return Fetch(`/circles/`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const JoinCircle = inviteCode => {
  return Fetch(`/circles/join?invite_code=${inviteCode}`, {
    method: 'POST',
    headers: HEADERS(),
  })
}

const GetCircleMemberRequests = () => {
  return Fetch(`/circles/members/requests`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const AcceptCircleMemberRequest = id => {
  return Fetch(`/circles/members/requests/accept?requestId=${id}`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}

const LeaveCircle = id => {
  return Fetch(`/circles/leave?circle_id=${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const DeleteCircleMember = (circleID, memberID) => {
  return Fetch(`/circles/${circleID}/members/delete?member_id=${memberID}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const UpdateUserDetails = userDetails => {
  return Fetch(`/users`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(userDetails),
  })
}

const UpdateNotificationTarget = notificationTarget => {
  return Fetch(`/users/targets`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(notificationTarget),
  })
}

const GetSubscriptionSession = () => {
  return Fetch(`/payments/create-subscription`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const CancelSubscription = () => {
  return Fetch(`/payments/cancel-subscription`, {
    method: 'POST',
    headers: HEADERS(),
  })
}

const GetThings = () => {
  return Fetch(`/things`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const CreateThing = thing => {
  return Fetch(`/things`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(thing),
  })
}

const SaveThing = thing => {
  return Fetch(`/things`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(thing),
  })
}

const UpdateThingState = thing => {
  return Fetch(`/things/${thing.id}/state?value=${thing.state}`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}
const DeleteThing = id => {
  return Fetch(`/things/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const GetThingHistory = (id, offset) => {
  return Fetch(`/things/${id}/history?offset=${offset}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const CreateLongLiveToken = name => {
  return Fetch(`/users/tokens`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({ name }),
  })
}
const DeleteLongLiveToken = id => {
  return Fetch(`/users/tokens/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const GetLongLiveTokens = () => {
  return Fetch(`/users/tokens`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const PutNotificationTarget = (platform, deviceToken) => {
  return Fetch(`/users/targets`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ platform, deviceToken }),
  })
}
const CreateLabel = async label => {
  if (shouldUseLocalFirstStore())
    return localResponse(await labelRepo.create(label))
  return Fetch(`/labels`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(label),
  })
}

const GetLabels = async () => {
  if (shouldUseLocalFirstStore()) return { res: await labelRepo.all() }
  const resp = await Fetch(`/labels`, {
    method: 'GET',
    headers: HEADERS(),
  })
  return resp.json()
}

const GetResource = async () => {
  await apiClient.init()
  const basedURL = apiManager.getApiURL()
  const resp = await fetch(`${basedURL}/resource`, {
    method: 'GET',
    headers: HEADERS(),
  })
  return resp.json()
}

const UpdateLabel = async label => {
  if (shouldUseLocalFirstStore())
    return localResponse(await labelRepo.update(label))
  return Fetch(`/labels`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(label),
  })
}
const DeleteLabel = async id => {
  if (shouldUseLocalFirstStore())
    return localResponse(await labelRepo.remove(id))
  return Fetch(`/labels/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const ChangePassword = (verifiticationCode, password) => {
  const baseURL = apiManager.getApiURL()
  return fetch(`${baseURL}/auth/password?c=${verifiticationCode}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: password }),
  })
}

const ResetPassword = async email => {
  await apiClient.init()
  const basedURL = apiManager.getApiURL()
  return fetch(`${basedURL}/auth/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email }),
  })
}

// MFA Related Functions
const GetMFAStatus = () => {
  return Fetch(`/users/mfa/status`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const SetupMFA = () => {
  return Fetch(`/users/mfa/setup`, {
    method: 'POST',
    headers: HEADERS(),
  })
}

const ConfirmMFA = (secret, code, backupCodes) => {
  return Fetch(`/users/mfa/confirm`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      secret,
      code,
      backupCodes,
    }),
  })
}

const DisableMFA = code => {
  return Fetch(`/users/mfa/disable`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({ code }),
  })
}

const RegenerateBackupCodes = code => {
  return Fetch(`/users/mfa/regenerate-backup-codes`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({ code }),
  })
}

const VerifyMFA = (sessionToken, code) => {
  const baseURL = apiManager.getApiURL()
  return fetch(`${baseURL}/auth/mfa/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionToken,
      code,
    }),
  })
}

const UpdateDueDate = (id, dueDate) => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.reschedule(id, dueDate).then(localResponse)
  }
  return Fetch(`/chores/${id}/dueDate`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      updatedAt: new Date().toISOString(),
    }),
  })
}

const RedeemPoints = (userId, points, circleID) => {
  return Fetch(`/circles/${circleID}/members/points/redeem`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({ points, userId }),
  })
}
const RefreshToken = async () => {
  const basedURL = apiManager.getApiURL()

  // Check if running on native platform
  const isNative =
    typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

  if (isNative) {
    // For native platforms, send refresh token in request body
    const { Preferences } = await import('@capacitor/preferences')
    const { value: refreshToken } = await Preferences.get({
      key: 'refresh_token',
    })

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    return fetch(`${basedURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  } else {
    // For web, continue using cookies
    return fetch(`${basedURL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: HEADERS(),
    })
  }
}
const GetChoresHistory = async (limit, includeMembers) => {
  var url = `/chores/history`
  if (!limit) limit = 7

  if (limit) {
    url += `?limit=${limit}`
  }
  if (includeMembers) {
    url += `&members=true`
  }
  const resp = await Fetch(url, {
    method: 'GET',
    headers: HEADERS(),
  })
  return resp.json()
}

const PutWebhookURL = url => {
  return Fetch(`/users/webhook`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ url }),
  })
}

const GetStorageUsage = () => {
  return Fetch(`/users/storage`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

// Timer/TimeSession API functions
const GetChoreTimer = choreId => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.getTimer(choreId).then(localResponse)
  }
  return Fetch(`/chores/${choreId}/timer`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const UpdateTimeSession = (choreId, sessionId, sessionData) => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.updateTimer(choreId, sessionData).then(localResponse)
  }
  return Fetch(`/chores/${choreId}/timer/${sessionId}`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(sessionData),
  })
}

const DeleteTimeSession = (choreId, sessionId) => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.deleteTimerSession(choreId, sessionId).then(localResponse)
  }
  return Fetch(`/chores/${choreId}/timer/${sessionId}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const ResetChoreTimer = choreId => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.resetTimer(choreId).then(localResponse)
  }
  return Fetch(`/chores/${choreId}/timer/reset`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}

const ClearChoreTimer = choreId => {
  if (shouldUseLocalFirstStore()) {
    return choreRepo.clearTimer(choreId).then(localResponse)
  }
  return Fetch(`/chores/${choreId}/timer`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const CheckUserDeletion = password => {
  return Fetch(`/users/delete/check`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      password,
    }),
  })
}

const DeleteUser = (password, confirmation, transferOptions = []) => {
  return Fetch(`/users/delete`, {
    method: 'DELETE',
    headers: HEADERS(),
    body: JSON.stringify({
      password,
      confirmation,
      transferOptions,
    }),
  })
}

const UploadChoreAttachment = (
  file,
  entityType,
  { draftId, entityId } = {},
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entityType', entityType)
  if (entityId != null) formData.append('entityId', String(entityId))
  if (draftId != null) formData.append('draftId', draftId)
  return apiClient.upload('/assets/chore', formData)
}

const DeleteDraftAttachment = filePath => {
  return Fetch(`/assets/chore`, {
    method: 'DELETE',
    headers: HEADERS(),
    body: JSON.stringify({ file_path: filePath }),
  })
}

// Returns a fresh signed URL for a stored asset path the current user may access.
const SignAssetURL = path => {
  return Fetch(`/files/sign?path=${encodeURIComponent(path)}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetChoreAttachments = choreId => {
  return Fetch(`/chores/${choreId}/attachments`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const DeleteChoreAttachment = (choreId, filePath) => {
  return Fetch(`/chores/${choreId}/attachments`, {
    method: 'DELETE',
    headers: HEADERS(),
    body: JSON.stringify({ file_path: filePath }),
  })
}

const CreateBackup = (encryptionKey, includeAssets = true, backupName = '') => {
  return Fetch(`/backup/create`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      encryption_key: encryptionKey,
      include_assets: includeAssets,
      backup_name: backupName,
    }),
  })
}

const RestoreBackup = (encryptionKey, backupData) => {
  return Fetch(`/backup/restore`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      encryption_key: encryptionKey,
      backup_data: backupData,
    }),
  })
}

const RegisterDeviceToken = (
  token,
  deviceId,
  platform,
  appVersion,
  deviceModel,
) => {
  return Fetch(`/devices/tokens`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      token,
      deviceId,
      platform,
      appVersion,
      deviceModel,
    }),
  })
}

const UnregisterDeviceToken = (deviceId, token) => {
  return Fetch(`/devices/tokens`, {
    method: 'DELETE',
    headers: HEADERS(),
    body: JSON.stringify({
      deviceId,
      token,
    }),
  })
}

const GetDeviceTokens = (active = true) => {
  return Fetch(`/devices/tokens?active=${active}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

// Child User Management Functions
const CreateChildUser = (childName, displayName, password) => {
  return Fetch(`/users/subaccounts`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      childName,
      displayName,
      password,
    }),
  })
}

const GetChildUsers = () => {
  return Fetch(`/users/subaccounts`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const UpdateChildPassword = (childUserId, password) => {
  return Fetch(`/users/subaccounts/password`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({
      childUserId,
      password,
    }),
  })
}

const DeleteChildUser = childUserId => {
  return Fetch(`/users/subaccounts/${childUserId}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

// Project-related API functions
const GetProjects = async () => {
  if (shouldUseLocalFirstStore()) return localResponse(await projectRepo.all())
  return Fetch(`/projects`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetProjectById = async id => {
  if (shouldUseLocalFirstStore())
    return localResponse(await projectRepo.get(id))
  return Fetch(`/projects/${id}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const CreateProject = async project => {
  if (shouldUseLocalFirstStore())
    return localResponse(await projectRepo.create(project))
  return Fetch(`/projects`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(project),
  })
}

const UpdateProject = async (id, project) => {
  if (shouldUseLocalFirstStore())
    return localResponse(await projectRepo.update(id, project))
  return Fetch(`/projects/${id}`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(project),
  })
}

const DeleteProject = async id => {
  if (shouldUseLocalFirstStore())
    return localResponse(await projectRepo.remove(id))
  return Fetch(`/projects/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

// Filter-related API functions
const GetFilters = async () => {
  if (isLocalMode()) return localResponse(await filterRepo.all())
  return Fetch(`/filters`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetPinnedFilters = async () => {
  if (isLocalMode()) return localResponse(await filterRepo.pinned())
  return Fetch(`/filters/pinned`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetFiltersByUsage = async () => {
  if (isLocalMode()) return localResponse(await filterRepo.byUsage())
  return Fetch(`/filters/by-usage`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetFilterById = async id => {
  if (isLocalMode()) return localResponse(await filterRepo.get(id))
  return Fetch(`/filters/${id}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const CreateFilter = async filter => {
  if (isLocalMode()) return localResponse(await filterRepo.create(filter))
  return Fetch(`/filters`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(filter),
  })
}

const UpdateFilter = async (id, filter) => {
  if (isLocalMode()) return localResponse(await filterRepo.update(id, filter))
  return Fetch(`/filters/${id}`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(filter),
  })
}

const DeleteFilter = async id => {
  if (isLocalMode()) return localResponse(await filterRepo.remove(id))
  return Fetch(`/filters/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const ToggleFilterPin = async id => {
  if (isLocalMode()) return localResponse(await filterRepo.togglePin(id))
  return Fetch(`/filters/${id}/toggle-pin`, {
    method: 'POST',
    headers: HEADERS(),
  })
}

const TrackFilterUsage = async id => {
  if (isLocalMode()) return localResponse(await filterRepo.trackUsage(id))
  return Fetch(`/filters/${id}/track-usage`, {
    method: 'POST',
    headers: HEADERS(),
  })
}

export {
  AcceptCircleMemberRequest,
  ApproveChore,
  ArchiveChore,
  CancelSubscription,
  ChangePassword,
  CheckUserDeletion,
  ClearChoreTimer,
  CompleteSubTask,
  ConfirmMFA,
  CreateBackup,
  CreateChildUser,
  CreateChore,
  createChore,
  CreateFilter,
  CreateLabel,
  CreateLongLiveToken,
  CreateProject,
  CreateThing,
  DeleteChildUser,
  DeleteChore,
  DeleteChoreAttachment,
  DeleteChoreHistory,
  DeleteCircleMember,
  DeleteDraftAttachment,
  DeleteFilter,
  DeleteLabel,
  DeleteLongLiveToken,
  DeleteProject,
  DeleteThing,
  DeleteTimeSession,
  DeleteUser,
  DisableMFA,
  GetAllCircleMembers,
  GetAllUsers,
  GetArchivedChores,
  GetChildUsers,
  GetChoreAttachments,
  GetChoreByID,
  GetChoreDetailById,
  GetChoreHistory,
  GetChores,
  GetChoresHistory,
  GetChoresNew,
  GetChoreTimer,
  GetCircleMemberRequests,
  GetDeviceTokens,
  GetFilterById,
  GetFilters,
  GetFiltersByUsage,
  GetLabels,
  GetLongLiveTokens,
  GetMFAStatus,
  GetPinnedFilters,
  GetProjectById,
  GetProjects,
  GetResource,
  GetStorageUsage,
  GetSubscriptionSession,
  GetThingHistory,
  GetThings,
  GetUserCircle,
  GetUserProfile,
  JoinCircle,
  LeaveCircle,
  login,
  logout,
  MarkChoreComplete,
  NudgeChore,
  PauseChore,
  PutNotificationTarget,
  PutWebhookURL,
  RedeemPoints,
  RefreshToken,
  RegenerateBackupCodes,
  RegisterDeviceToken,
  RejectChore,
  ResetChoreTimer,
  ResetPassword,
  RestoreBackup,
  SaveChore,
  SaveThing,
  SetupMFA,
  SignAssetURL,
  signUp,
  SkipChore,
  StartChore,
  ToggleFilterPin,
  TrackFilterUsage,
  UnArchiveChore,
  UndoChoreAction,
  UnregisterDeviceToken,
  UpdateChildPassword,
  UpdateChoreAssignee,
  UpdateChoreHistory,
  UpdateChorePriority,
  UpdateDueDate,
  UpdateFilter,
  UpdateLabel,
  UpdateMemberRole,
  UpdateNotificationTarget,
  UpdatePassword,
  UpdateProject,
  UpdateThingState,
  UpdateTimeSession,
  UpdateUserDetails,
  UploadChoreAttachment,
  VerifyMFA,
}
