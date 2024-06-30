import { Button, Divider, Input, Option, Select, Typography } from '@mui/joy'
import { useContext, useEffect, useState } from 'react'
import { UserContext } from '../../contexts/UserContext'
import { GetUserProfile, UpdateUserDetails } from '../../utils/Fetcher'

const NotificationSetting = () => {
  const { userProfile, setUserProfile } = useContext(UserContext)
  useEffect(() => {
    if (!userProfile) {
      GetUserProfile().then(resp => {
        resp.json().then(data => {
          setUserProfile(data.res)
          setChatID(data.res.chatID)
        })
      })
    }
  }, [])
  const [chatID, setChatID] = useState(userProfile?.chatID)

  return (
    <div className='grid gap-4 py-4' id='notifications'>
      <Typography level='h3'>Notification Settings</Typography>
      <Divider />
      <Typography level='body-md'>Manage your notification settings</Typography>

      <Select defaultValue='telegram' sx={{ maxWidth: '200px' }} disabled>
        <Option value='telegram'>Telegram</Option>
        <Option value='discord'>Discord</Option>
      </Select>

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

      <Input
        value={chatID}
        onChange={e => setChatID(e.target.value)}
        placeholder='User ID / Chat ID'
        sx={{
          width: '200px',
        }}
      />
      <Typography mt={0} level='body-xs'>
        If you don't know your Chat ID, start chat with userinfobot and it will
        send you your Chat ID.{' '}
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

      <Button
        sx={{
          width: '110px',
          mb: 1,
        }}
        onClick={() => {
          UpdateUserDetails({
            chatID: Number(chatID),
          }).then(resp => {
            resp.json().then(data => {
              setUserProfile(data)
            })
          })
        }}
      >
        Save
      </Button>
    </div>
  )
}

export default NotificationSetting
