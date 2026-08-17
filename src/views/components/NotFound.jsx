import { Explore, HomeRounded } from '@mui/icons-material'
import { Container } from '@mui/joy'

import EmptyState from '../../components/common/EmptyState'

const NotFound = () => {
  return (
    <Container maxWidth='sm'>
      <EmptyState
        variant='no-results'
        fullHeight
        icon={<Explore />}
        title='Page not found'
        description='This link does not lead anywhere. It may have moved, or the address has a typo in it.'
        primaryAction={{
          label: 'Go to my tasks',
          to: '/chores',
          startDecorator: <HomeRounded />,
        }}
        secondaryAction={{ label: 'Log in', to: '/login' }}
      />
    </Container>
  )
}

export default NotFound
