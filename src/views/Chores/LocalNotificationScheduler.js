import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import murmurhash from 'murmurhash'

const MAX_LOCAL_NOTIFICATIONS = 64

const getNotificationPreferences = async () => {
  const ret = await Preferences.get({ key: 'notificationPreferences' })
  return JSON.parse(ret.value)
}

const canScheduleNotification = async () => {
  if (Capacitor.isNativePlatform() === false) {
    return false
  }
  const notificationPreferences = await getNotificationPreferences()
  console.log('Notification preferences:', notificationPreferences)

  if (notificationPreferences['granted'] === false) {
    return false
  }
  return true
}

const getIdFromTemplate = (choreId, template) => {
  const hash = murmurhash.v3(`${choreId}-${template.value}-${template.unit}`)
  // Use Math.abs() with modulo to ensure positive ID within Java int range
  // This guarantees the ID is always positive and within 1 to 2^31-1
  return Math.abs(hash) % 2147483647
}

const getTimeFromTemplate = (template, relativeTime) => {
  let time = relativeTime
  switch (template.unit) {
    case 'm':
      time = new Date(relativeTime.getTime() + template.value * 60 * 1000)
      break
    case 'h':
      time = new Date(relativeTime.getTime() + template.value * 60 * 60 * 1000)
      break
    case 'd':
      time = new Date(
        relativeTime.getTime() + template.value * 24 * 60 * 60 * 1000,
      )
      break
    default:
      time = relativeTime
  }
  return time
}
// Decide whether this device's user should be notified about a chore:
// - assignedTo set   -> only that user
// - no assignedTo    -> everyone listed in assignees
// - no assignees     -> "Anyone" mode, notify the whole circle
const shouldNotifyUser = (chore, userId) => {
  if (!userId) {
    return false
  }
  if (chore.assignedTo > 0) {
    return chore.assignedTo === userId
  }
  if (chore.assignees?.length > 0) {
    return chore.assignees.some(assignee => assignee.userId === userId)
  }
  return true
}

const scheduleNotificationFromTemplate = (
  chore,
  userProfile,
  allPerformers,
  notifications,
) => {
  for (const template of chore.notificationMetadata?.templates || []) {
    // convert the template to time:
    const dueDate = new Date(chore.nextDueDate)
    const now = new Date()
    const time = getTimeFromTemplate(template, dueDate)
    const notificationId = getIdFromTemplate(chore.id, template)
    const { body, title } = getNotificationText(
      chore.name,
      template,
      dueDate,
      time,
    )
    if (time > now) {
      notifications.push({
        title,
        body,
        id: notificationId,
        allowWhileIdle: true,
        schedule: {
          at: time,
        },
        extra: {
          choreId: chore.id,
        },
      })
    }
  }
}

const getNotificationText = (
  choreName,
  template = {},
  dueDate,
  notificationTime,
) => {
  const startOfDay = date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDifference = Math.round(
    (startOfDay(dueDate) - startOfDay(notificationTime)) /
      (24 * 60 * 60 * 1000),
  )
  const time = dueDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  let dueTime
  if (dayDifference === 0) {
    dueTime = `today at ${time}`
  } else if (dayDifference === 1) {
    dueTime = `tomorrow at ${time}`
  } else if (dayDifference === -1) {
    dueTime = `yesterday at ${time}`
  } else {
    const date = dueDate.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    })
    dueTime = `${date} at ${time}`
  }

  let body
  if (template.value < 0) {
    body = `Due ${dueTime}`
  } else if (template.value > 0) {
    body = `Overdue · Was due ${dueTime}`
  } else {
    body = 'Due now'
  }

  return {
    title: choreName,
    body,
  }
}
const cancelPendingNotifications = async () => {
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
      console.log('Cancelled pending notifications:', pending.notifications)
    } else {
      console.log('No pending notifications to cancel.')
    }
  } catch (error) {
    console.error('Error cancelling pending notifications:', error)
  }
}
const scheduleChoreNotification = async (
  chores,
  userProfile,
  allPerformers,
) => {
  await cancelPendingNotifications()
  const notifications = []

  for (let i = 0; i < chores.length; i++) {
    const chore = chores[i]
    try {
      if (
        chore.notification === false ||
        chore.nextDueDate === null ||
        chore.isActive === false ||
        !shouldNotifyUser(chore, userProfile?.id)
      ) {
        continue
      }
      scheduleNotificationFromTemplate(
        chore,
        userProfile,
        allPerformers,
        notifications,
      )
    } catch (error) {
      console.error(
        'Error parsing notification metadata for chore:',
        chore.id,
        error,
      )
      continue
    }
  }
  // sort from soonest to latest:
  notifications.sort((a, b) => a.schedule.at - b.schedule.at)

  // cap it for 64 notifications for Android:
  if (notifications.length > MAX_LOCAL_NOTIFICATIONS) {
    notifications.splice(MAX_LOCAL_NOTIFICATIONS)
  }

  LocalNotifications.schedule({
    notifications,
  })
  return notifications
}

export { canScheduleNotification, scheduleChoreNotification }
