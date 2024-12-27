import { Button, Divider, Input, Option, Select, Typography } from '@mui/joy'
import { useContext, useState } from 'react'
import { UserContext } from '../../contexts/UserContext'
import { UpdateNotificationTarget } from '../../utils/Fetcher'

const NotificationSetting = () => {
  const { userProfile, setUserProfile } = useContext(UserContext)
  const [notificationTarget, setNotificationTarget] = useState(
    userProfile?.notification_target
      ? String(userProfile.notification_target.type)
      : '0',
  )

  const [chatID, setChatID] = useState(
    userProfile?.notification_target?.target_id,
  )
  const [error, setError] = useState('')
  const SaveValidation = () => {
    switch (notificationTarget) {
      case '1':
        if (chatID === '') {
          setError('Chat ID is required')
          return false
        } else if (isNaN(chatID) || chatID === '0') {
          setError('Invalid Chat ID')
          return false
        }
        break
      case '2':
        if (chatID === '') {
          setError('User key is required')
          return false
        }
        break
      default:
        break
    }
    setError('')
    return true
  }
  const handleSave = () => {
    if (!SaveValidation()) return

    UpdateNotificationTarget({
      target: chatID,
      type: Number(notificationTarget),
    }).then(resp => {
      if (resp.status != 200) {
        alert(`Error while updating notification target: ${resp.statusText}`)
        return
      }

      setUserProfile({
        ...userProfile,
        notification_target: {
          target: chatID,
          type: Number(notificationTarget),
        },
      })
      alert('Notification target updated')
    })
  }
  return (
    <div className='grid gap-4 py-4' id='notifications'>
      <Typography level='h3'>Notification Settings</Typography>
      <Divider />
      <Typography level='body-md'>Manage your notification settings</Typography>

      <Select
        value={notificationTarget}
        sx={{ maxWidth: '200px' }}
        onChange={(e, selected) => setNotificationTarget(selected)}
      >
        <Option value='0'>None</Option>
        <Option value='1'>Telegram</Option>
        <Option value='2'>Pushover</Option>
      </Select>
      {notificationTarget === '1' && (
        <>
          <Typography level='body-xs'>
            You need to initiate a message to the bot in order for the Telegram
            notification to work{' '}
            <a
              style={{
                textDecoration: 'underline',
                color: '#0891b2',
              }}
              href='https://t.me/DonetickBot'
            >
              Click here
            </a>{' '}
            to start a chat
          </Typography>

          <Typography level='body-sm'>Chat ID</Typography>

          <Input
            value={chatID}
            onChange={e => setChatID(e.target.value)}
            placeholder='User ID / Chat ID'
            sx={{
              width: '200px',
            }}
          />
          <Typography mt={0} level='body-xs'>
            If you don't know your Chat ID, start chat with userinfobot and it
            will send you your Chat ID.{' '}
            <a
              style={{
                textDecoration: 'underline',
                color: '#0891b2',
              }}
              href='https://t.me/userinfobot'
            >
              Click here
            </a>{' '}
            to start chat with userinfobot{' '}
          </Typography>
        </>
      )}
      {notificationTarget === '2' && (
        <>
          <Typography level='body-sm'>User key</Typography>
          <Input
            value={chatID}
            onChange={e => setChatID(e.target.value)}
            placeholder='User ID'
            sx={{
              width: '200px',
            }}
          />
        </>
      )}
      {error && (
        <Typography color='warning' level='body-sm'>
          {error}
        </Typography>
      )}

      <Button
        sx={{
          width: '110px',
          mb: 1,
        }}
        onClick={handleSave}
      >
        Save
      </Button>
    </div>
  )
}

export default NotificationSetting
