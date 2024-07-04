import { EventBusy } from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Container,
  List,
  ListDivider,
  ListItem,
  ListItemContent,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GetThingHistory } from '../../utils/Fetcher'

const ThingsHistory = () => {
  const { id } = useParams()
  const [thingsHistory, setThingsHistory] = useState([])
  const [noMoreHistory, setNoMoreHistory] = useState(false)
  const [errLoading, setErrLoading] = useState(false)
  useEffect(() => {
    GetThingHistory(id, 0, 10).then(resp => {
      if (resp.ok) {
        resp.json().then(data => {
          setThingsHistory(data.res)
          if (data.res.length < 10) {
            setNoMoreHistory(true)
          }
        })
      } else {
        setErrLoading(true)
      }
    })
  }, [])

  const handleLoadMore = () => {
    GetThingHistory(id, thingsHistory.length).then(resp => {
      if (resp.ok) {
        resp.json().then(data => {
          setThingsHistory([...thingsHistory, ...data.res])
          if (data.res.length < 10) {
            setNoMoreHistory(true)
          }
        })
      }
    })
  }

  const formatTimeDifference = (startDate, endDate) => {
    const diffInMinutes = moment(startDate).diff(endDate, 'minutes')
    let timeValue = diffInMinutes
    let unit = 'minute'

    if (diffInMinutes >= 60) {
      const diffInHours = moment(startDate).diff(endDate, 'hours')
      timeValue = diffInHours
      unit = 'hour'

      if (diffInHours >= 24) {
        const diffInDays = moment(startDate).diff(endDate, 'days')
        timeValue = diffInDays
        unit = 'day'
      }
    }

    return `${timeValue} ${unit}${timeValue !== 1 ? 's' : ''}`
  }
  if (errLoading || !thingsHistory) {
    return (
      <Container
        maxWidth='md'
        sx={{
          textAlign: 'center',
          display: 'flex',
          // make sure the content is centered vertically:
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          height: '50vh',
        }}
      >
        <EventBusy
          sx={{
            fontSize: '6rem',
            // color: 'text.disabled',
            mb: 1,
          }}
        />

        <Typography level='h3' gutterBottom>
          No history found
        </Typography>
        <Typography level='body1'>
          It's look like there is no history for this thing yet.
        </Typography>
        <Button variant='soft' sx={{ mt: 2 }}>
          <Link to='/things'>Go back to things</Link>
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth='md'>
      <Typography level='h3' mb={1.5}>
        History:
      </Typography>
      <Box sx={{ borderRadius: 'sm', p: 2, boxShadow: 'md' }}>
        <List sx={{ p: 0 }}>
          {thingsHistory.map((history, index) => (
            <>
              <ListItem sx={{ gap: 1.5, alignItems: 'flex-start' }}>
                <ListItemContent sx={{ my: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography level='body1' sx={{ fontWeight: 'md' }}>
                      {moment(history.updatedAt).format(
                        'ddd MM/DD/yyyy HH:mm:ss',
                      )}
                    </Typography>
                    <Chip>{history.state === '1' ? 'Active' : 'Inactive'}</Chip>
                  </Box>
                </ListItemContent>
              </ListItem>
              {index < thingsHistory.length - 1 && (
                <>
                  <ListDivider component='li'>
                    {/* time between two completion: */}
                    {index < thingsHistory.length - 1 &&
                      thingsHistory[index + 1].createdAt && (
                        <Typography level='body3' color='text.tertiary'>
                          {formatTimeDifference(
                            history.createdAt,
                            thingsHistory[index + 1].createdAt,
                          )}{' '}
                          before
                        </Typography>
                      )}
                  </ListDivider>
                </>
              )}
            </>
          ))}
        </List>
      </Box>
      {/* Load more Button  */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mt: 2,
        }}
      >
        <Button
          variant='plain'
          fullWidth
          color='primary'
          onClick={handleLoadMore}
          disabled={noMoreHistory}
        >
          {noMoreHistory ? 'No more history' : 'Load more'}
        </Button>
      </Box>
    </Container>
  )
}

export default ThingsHistory
