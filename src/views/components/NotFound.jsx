import { Explore, HomeRounded } from '@mui/icons-material'
import { Container } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import EmptyState from '../../components/common/EmptyState'

const NotFound = () => {
  const { t } = useTranslation('common')
  return (
    <Container maxWidth='sm'>
      <EmptyState
        variant='no-results'
        fullHeight
        icon={<Explore />}
        title={t('notFound.title')}
        description={t('notFound.description')}
        primaryAction={{
          label: t('notFound.goToMyTasks'),
          to: '/chores',
          startDecorator: <HomeRounded />,
        }}
        secondaryAction={{ label: t('notFound.logIn'), to: '/login' }}
      />
    </Container>
  )
}

export default NotFound
