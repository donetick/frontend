import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

const getNotificationPreferences = async () => {
    const ret = await Preferences.get({ key: 'notificationPreferences' });
    return JSON.parse(ret.value);
  };

const canScheduleNotification = () => {
    if (Capacitor.isNativePlatform() === false) {
        return false;
    }
    const notificationPreferences = getNotificationPreferences();
    if (notificationPreferences["granted"] === false) {
        return false;
    }
    return true;
}


const scheduleChoreNotification = async (chores, userProfile,allPerformers) => {
    // for each chore will create local notification:
    const notifications = [];
    const now = new Date()
    
    const devicePreferences = await getNotificationPreferences();
    
    for (let i = 0; i < chores.length; i++) {

        const chore = chores[i];
        const chorePreferences =  JSON.parse(chore.notificationMetadata)
        if ( chore.notification ===false || chore.nextDueDate === null) {
            continue;
        }
        scheduleDueNotification(chore, userProfile, allPerformers,chorePreferences,devicePreferences, notifications)
        schedulePreDueNotification(chore, userProfile, allPerformers,chorePreferences, devicePreferences,notifications)     
        scheduleNaggingNotification(chore, userProfile, allPerformers,chorePreferences,devicePreferences, notifications)
        

    }
    LocalNotifications.schedule({
        notifications,
    });
}

const scheduleDueNotification = (chore, userProfile, allPerformers,chorePreferences,devicePreferences, notifications) => {
   
    if (devicePreferences['dueNotification'] !== true || chorePreferences['dueDate'] !== true){
        return
    }

    const nextDueDate = new Date(chore.nextDueDate)
    const diff = nextDueDate - now

    if (diff < 0) {
        return
    }
    
    const notification = {
        title: `${chore.name} is due! 🕒`,
        body: userProfile.id === chore.assignedTo ? `It's assigned to you!` : `It is ${allPerformers[chore.assignedTo].name}'s turn`,
        id: chore.id,
        allowWhileIdle: true,
        schedule: {
            at: new Date(chore.nextDueDate),
        },
        extra: {
            choreId: chore.id,
        },
    };
    notifications.push(notification);
}

const schedulePreDueNotification = (chore, userProfile, allPerformers,chorePreferences,devicePreferences, notifications) => {
    if (devicePreferences['preDueNotification'] !== true || chorePreferences['preDue'] !== true){ 
        return
    }
    
    const nextDueDate = new Date(chore.nextDueDate)
    const diff = nextDueDate - now

    if (diff < 0 || userProfile.id !== chore.assignedTo) {
        return
    }

    const notification = {
        title: `${chore.name} is due soon! 🕒`,
        body: `is due at ${nextDueDate.toLocaleTimeString()}`,
        id: chore.id,
        allowWhileIdle: true,
        schedule: {
            // 1 hour before
            at: new Date(nextDueDate - 60 * 60 * 1000),
        },
        extra: {
            choreId: chore.id,
        },
    };
    notifications.push(notification);
}
const scheduleNaggingNotification = (chore, userProfile, allPerformers,chorePreferences,devicePreferences, notifications) => {
    if (devicePreferences['naggingNotification'] === false || chorePreferences.nagging !== true){
        return
    }
    const nextDueDate = new Date(chore.nextDueDate)
    const diff = nextDueDate - now

    if (diff > 0 || userProfile.id !== chore.assignedTo) {
        return
    }

    const notification = {
        title: `${chore.name} is overdue! 🕒`,
        body: `❗ It was due at ${nextDueDate.toLocaleTimeString()}`,
        id: chore.id,
        allowWhileIdle: true,
        schedule: {
            at: new Date(chore.nextDueDate),
        },
        extra: {
            choreId: chore.id,
        },
    };
    notifications.push(notification);
}

export{ scheduleChoreNotification, canScheduleNotification }