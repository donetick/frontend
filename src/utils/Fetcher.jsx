import { Fetch, HEADERS, apiManager } from './TokenManager'

const createChore = userID => {
  return Fetch(`/chores/`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      createdBy: Number(userID),
    }),
  }).then(response => response.json())
}

const signUp = (username, password, displayName, email) => {
  const baseURL = apiManager.getApiURL()
  return fetch(`${baseURL}/auth/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, displayName, email }),
  })
}

const UpdatePassword = newPassword => {
  const baseURL = apiManager.getApiURL()
  return fetch(`${baseURL}/users/change_password`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ password: newPassword }),
  })
}

const login = (username, password) => {
  const baseURL = apiManager.getApiURL()
  return fetch(`${baseURL}/auth/login`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
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
const MarkChoreComplete = (id, note, completedDate, performer) => {
  var markChoreURL = `/chores/${id}/do`

  const body = {
    note,
  }
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

const SkipChore = id => {
  return Fetch(`/chores/${id}/skip`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

const UpdateChoreAssignee = (id, assignee) => {
  return Fetch(`/chores/${id}/assignee`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ assignee: Number(assignee) }),
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

const UpdateChoreStatus = (choreId, status) => {
  return Fetch(`/chores/${choreId}/status`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ status }),
  })
}

const GetAllCircleMembers = async () => {
  const resp = await Fetch(`/circles/members`, {
    method: 'GET',
    headers: HEADERS(),
  })
  return resp.json()
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

const UpdateDueDate = (id, dueDate) => {
  return Fetch(`/chores/${id}/dueDate`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
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

const RefreshToken = () => {
  const basedURL = apiManager.getApiURL()
  return fetch(`${basedURL}/auth/refresh`, {
    method: 'GET',
    headers: HEADERS(),
  })
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
export {
  AcceptCircleMemberRequest,
  ArchiveChore,
  CancelSubscription,
  ChangePassword,
  CreateChore,
  CreateLabel,
  CreateLongLiveToken,
  CreateThing,
  DeleteChore,
  DeleteChoreHistory,
  DeleteCircleMember,
  DeleteLabel,
  DeleteLongLiveToken,
  DeleteThing,
  GetAllCircleMembers,
  GetAllUsers,
  GetArchivedChores,
  GetChoreByID,
  GetChoreDetailById,
  GetChoreHistory,
  GetChores,
  GetChoresHistory,
  GetChoresNew,
  GetCircleMemberRequests,
  GetLabels,
  GetLongLiveTokens,
  GetSubscriptionSession,
  GetThingHistory,
  GetThings,
  GetUserCircle,
  GetUserProfile,
  JoinCircle,
  LeaveCircle,
  MarkChoreComplete,
  PutNotificationTarget,
  RedeemPoints,
  RefreshToken,
  ResetPassword,
  SaveChore,
  SaveThing,
  SkipChore,
  UnArchiveChore,
  UpdateChoreAssignee,
  UpdateChoreHistory,
  UpdateChorePriority,
  UpdateChoreStatus,
  UpdateDueDate,
  UpdateLabel,
  UpdateNotificationTarget,
  UpdatePassword,
  UpdateThingState,
  UpdateUserDetails,
  createChore,
  login,
  signUp,
}
