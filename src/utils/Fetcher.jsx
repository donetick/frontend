import { API_URL } from '../Config'
import { Fetch, HEADERS } from './TokenManager'

const createChore = userID => {
  return Fetch(`${API_URL}/chores/`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      createdBy: Number(userID),
    }),
  }).then(response => response.json())
}

const signUp = (username, password, displayName, email) => {
  return fetch(`${API_URL}/auth/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, displayName, email }),
  })
}

const UpdatePassword = newPassword => {
  return fetch(`${API_URL}/users/change_password`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ password: newPassword }),
  })
}

const login = (username, password) => {
  return fetch(`${API_URL}/auth/login`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

const GetAllUsers = () => {
  return fetch(`${API_URL}/users/`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const GetChoresNew = async () => {
  const resp = await Fetch(`${API_URL}/chores/`, {
    method: 'GET',
    headers: HEADERS(),
  })
  return resp.json()
}

const GetChores = () => {
  return Fetch(`${API_URL}/chores/`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetChoreByID = id => {
  return Fetch(`${API_URL}/chores/${id}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const GetChoreDetailById = id => {
  return Fetch(`${API_URL}/chores/${id}/details`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const MarkChoreComplete = (id, note, completedDate) => {
  const body = {
    note,
  }
  let completedDateFormated = ''
  if (completedDate) {
    completedDateFormated = `?completedDate=${new Date(
      completedDate,
    ).toISOString()}`
  }
  return Fetch(`${API_URL}/chores/${id}/do${completedDateFormated}`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(body),
  })
}

const SkipChore = id => {
  return Fetch(`${API_URL}/chores/${id}/skip`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

const UpdateChoreAssignee = (id, assignee) => {
  return Fetch(`${API_URL}/chores/${id}/assignee`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ assignee: Number(assignee) }),
  })
}

const CreateChore = chore => {
  return Fetch(`${API_URL}/chores/`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(chore),
  })
}

const DeleteChore = id => {
  return Fetch(`${API_URL}/chores/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const SaveChore = chore => {
  return Fetch(`${API_URL}/chores/`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(chore),
  })
}

const UpdateChorePriority = (id, priority) => {
  return Fetch(`${API_URL}/chores/${id}/priority `, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify({ priority: priority }),
  })
}
const GetChoreHistory = choreId => {
  return Fetch(`${API_URL}/chores/${choreId}/history`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const DeleteChoreHistory = (choreId, id) => {
  return Fetch(`${API_URL}/chores/${choreId}/history/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const UpdateChoreHistory = (choreId, id, choreHistory) => {
  return Fetch(`${API_URL}/chores/${choreId}/history/${id}`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(choreHistory),
  })
}

const GetAllCircleMembers = () => {
  return Fetch(`${API_URL}/circles/members`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetUserProfile = () => {
  return Fetch(`${API_URL}/users/profile`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const GetUserCircle = () => {
  return Fetch(`${API_URL}/circles/`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const JoinCircle = inviteCode => {
  return Fetch(`${API_URL}/circles/join?invite_code=${inviteCode}`, {
    method: 'POST',
    headers: HEADERS(),
  })
}

const GetCircleMemberRequests = () => {
  return Fetch(`${API_URL}/circles/members/requests`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const AcceptCircleMemberRequest = id => {
  return Fetch(`${API_URL}/circles/members/requests/accept?requestId=${id}`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}

const LeaveCircle = id => {
  return Fetch(`${API_URL}/circles/leave?circle_id=${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const DeleteCircleMember = (circleID, memberID) => {
  return Fetch(
    `${API_URL}/circles/${circleID}/members/delete?member_id=${memberID}`,
    {
      method: 'DELETE',
      headers: HEADERS(),
    },
  )
}

const UpdateUserDetails = userDetails => {
  return Fetch(`${API_URL}/users`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(userDetails),
  })
}

const GetSubscriptionSession = () => {
  return Fetch(API_URL + `/payments/create-subscription`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const CancelSubscription = () => {
  return Fetch(API_URL + `/payments/cancel-subscription`, {
    method: 'POST',
    headers: HEADERS(),
  })
}

const GetThings = () => {
  return Fetch(`${API_URL}/things`, {
    method: 'GET',
    headers: HEADERS(),
  })
}
const CreateThing = thing => {
  return Fetch(`${API_URL}/things`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(thing),
  })
}

const SaveThing = thing => {
  return Fetch(`${API_URL}/things`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(thing),
  })
}

const UpdateThingState = thing => {
  return Fetch(`${API_URL}/things/${thing.id}/state?value=${thing.state}`, {
    method: 'PUT',
    headers: HEADERS(),
  })
}
const DeleteThing = id => {
  return Fetch(`${API_URL}/things/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const GetThingHistory = (id, offset) => {
  return Fetch(`${API_URL}/things/${id}/history?offset=${offset}`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const CreateLongLiveToken = name => {
  return Fetch(`${API_URL}/users/tokens`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({ name }),
  })
}
const DeleteLongLiveToken = id => {
  return Fetch(`${API_URL}/users/tokens/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

const GetLongLiveTokens = () => {
  return Fetch(`${API_URL}/users/tokens`, {
    method: 'GET',
    headers: HEADERS(),
  })
}

const CreateLabel = label => {
  return Fetch(`${API_URL}/labels`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify(label),
  })
}

const GetLabels = async () => {
  const resp = await Fetch(`${API_URL}/labels`, {
    method: 'GET',
    headers: HEADERS(),
  })
  return resp.json()
}

const UpdateLabel = label => {
  return Fetch(`${API_URL}/labels`, {
    method: 'PUT',
    headers: HEADERS(),
    body: JSON.stringify(label),
  })
}
const DeleteLabel = id => {
  return Fetch(`${API_URL}/labels/${id}`, {
    method: 'DELETE',
    headers: HEADERS(),
  })
}

export {
  AcceptCircleMemberRequest,
  CancelSubscription,
  createChore,
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
  GetChoreByID,
  GetChoreDetailById,
  GetChoreHistory,
  GetChores,
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
  login,
  MarkChoreComplete,
  SaveChore,
  SaveThing,
  signUp,
  SkipChore,
  UpdateChoreAssignee,
  UpdateChoreHistory,
  UpdateChorePriority,
  UpdateLabel,
  UpdatePassword,
  UpdateThingState,
  UpdateUserDetails,
}
