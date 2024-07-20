import { Box, Button, Card, Chip, Divider, Typography } from '@mui/joy'
import moment from 'moment'
import { useContext, useEffect, useState } from 'react'
import { UserContext } from '../../contexts/UserContext'
import {
  CreateLongLiveToken,
  DeleteLongLiveToken,
  GetLongLiveTokens,
} from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import TextModal from '../Modals/Inputs/TextModal'

const APITokenSettings = () => {
  const [tokens, setTokens] = useState([])
  const [isGetTokenNameModalOpen, setIsGetTokenNameModalOpen] = useState(false)
  const { userProfile, setUserProfile } = useContext(UserContext)
  useEffect(() => {
    GetLongLiveTokens().then(resp => {
      resp.json().then(data => {
        setTokens(data.res)
      })
    })
  }, [])

  const handleSaveToken = name => {
    CreateLongLiveToken(name).then(resp => {
      if (resp.ok) {
        resp.json().then(data => {
          // add the token to the list:
          console.log(data)
          const newTokens = [...tokens]
          newTokens.push(data.res)
          setTokens(newTokens)
        })
      }
    })
  }

  return (
    <div className='grid gap-4 py-4' id='apitokens'>
      <Typography level='h3'>Access Token</Typography>
      <Divider />
      <Typography level='body-sm'>
        Create token to use with the API to update things that trigger task or
        chores
      </Typography>
      {!isPlusAccount(userProfile) && (
        <Chip variant='soft' color='warning'>
          Not available in Basic Plan
        </Chip>
      )}

      {tokens.map(token => (
        <Card key={token.token} className='p-4'>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Typography level='body-md'>{token.name}</Typography>
              <Typography level='body-xs'>
                {moment(token.createdAt).fromNow()}(
                {moment(token.createdAt).format('lll')})
              </Typography>
            </Box>
            <Box>
              {token.token && (
                <Button
                  variant='outlined'
                  color='primary'
                  sx={{ mr: 1 }}
                  onClick={() => {
                    navigator.clipboard.writeText(token.token)
                    alert('Token copied to clipboard')
                  }}
                >
                  Copy Token
                </Button>
              )}

              <Button
                variant='outlined'
                color='danger'
                onClick={() => {
                  const confirmed = confirm(
                    `Are you sure you want to remove ${token.name} ?`,
                  )
                  if (confirmed) {
                    DeleteLongLiveToken(token.id).then(resp => {
                      if (resp.ok) {
                        alert('Token removed')
                        const newTokens = tokens.filter(t => t.id !== token.id)
                        setTokens(newTokens)
                      }
                    })
                  }
                }}
              >
                Remove
              </Button>
            </Box>
          </Box>
        </Card>
      ))}

      <Button
        variant='soft'
        color='primary'
        disabled={!isPlusAccount(userProfile)}
        sx={{
          width: '210px',
          mb: 1,
        }}
        onClick={() => {
          setIsGetTokenNameModalOpen(true)
        }}
      >
        Generate New Token
      </Button>
      <TextModal
        isOpen={isGetTokenNameModalOpen}
        title='Give a name for your new token, something to remember it by.'
        onClose={() => {
          setIsGetTokenNameModalOpen(false)
        }}
        okText={'Generate Token'}
        onSave={handleSaveToken}
      />
    </div>
  )
}

export default APITokenSettings
