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
  return Fetch(`/chores/archived`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const ArchiveChore = id => {
  return Fetch(`/chores/${id}/archive`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}
const UnArchiveChore = id => {
  return Fetch(`/chores/${id}/unarchive`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}

const GetChoreByID = id => {
  return Fetch(`/chores/${id}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const GetChoreDetailById = id => {
  return Fetch(`/chores/${id}/details`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const MarkChoreComplete = (id, body, completedDate, performer) => {
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
  })
}

const StartChore = id => {
  return Fetch(`/chores/${id}/start`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}

const PauseChore = id => {
  return Fetch(`/chores/${id}/pause`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}

const CompleteSubTask = (id, choreId, completedAt) => {
  var markChoreURL = `/chores/${choreId}/subtask`
  return Fetch(markChoreURL, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ completedAt, id, choreId }),
  })
}

const SkipChore = id => {
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
  return Fetch(`/chores/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const SaveChore = chore => {
  return Fetch(`/chores/`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(chore),
  })
}

const UpdateChorePriority = (id, priority) => {
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
const CreateLabel = label => {
  return Fetch(`/labels`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(label),
  })
}

const GetLabels = async () => {
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

const UpdateLabel = label => {
  return Fetch(`/labels`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(label),
  })
}
const DeleteLabel = id => {
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

const ResetPassword = email => {
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
  return Fetch(`/chores/${choreId}/timer`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const UpdateTimeSession = (choreId, sessionId, sessionData) => {
  return Fetch(`/chores/${choreId}/timer/${sessionId}`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(sessionData),
  })
}

const DeleteTimeSession = (choreId, sessionId) => {
  return Fetch(`/chores/${choreId}/timer/${sessionId}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const ResetChoreTimer = choreId => {
  return Fetch(`/chores/${choreId}/timer/reset`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}

const ClearChoreTimer = choreId => {
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
const GetProjects = () => {
  return Fetch(`/projects`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetProjectById = id => {
  return Fetch(`/projects/${id}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const CreateProject = project => {
  return Fetch(`/projects`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(project),
  })
}

const UpdateProject = (id, project) => {
  return Fetch(`/projects/${id}`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(project),
  })
}

const DeleteProject = id => {
  return Fetch(`/projects/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

// Filter-related API functions
const GetFilters = () => {
  return Fetch(`/filters`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetPinnedFilters = () => {
  return Fetch(`/filters/pinned`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetFiltersByUsage = () => {
  return Fetch(`/filters/by-usage`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetFilterById = id => {
  return Fetch(`/filters/${id}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const CreateFilter = filter => {
  return Fetch(`/filters`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(filter),
  })
}

const UpdateFilter = (id, filter) => {
  return Fetch(`/filters/${id}`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(filter),
  })
}

const DeleteFilter = id => {
  return Fetch(`/filters/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const ToggleFilterPin = id => {
  return Fetch(`/filters/${id}/toggle-pin`, {
    method: 'POST',
    headers: HEADERS(),
  })
}

const TrackFilterUsage = id => {
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
  DeleteChoreHistory,
  DeleteCircleMember,
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
  VerifyMFA
}

