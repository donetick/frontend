import { Feedback, ReportProblem, Star } from '@mui/icons-material'
import { Box, Button, Container, Sheet, Stack, Typography } from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { version } from '../../../package.json'
import { SETTINGS_GROUPS } from '../../constants/settingsSections'
import { useResource } from '../../queries/ResourceQueries'
import { useUserProfile } from '../../queries/UserQueries'
import { isPlusAccount } from '../../utils/Helpers'
import { isParentUser } from '../../utils/UserHelpers'
import ErrorReportModal from '../Modals/ErrorReportModal'
import FeedbackModal from '../Modals/FeedbackModal'
import SettingsLinks from './SettingsLinks'
import { useVisibleSettings } from './useVisibleSettings'

const SettingsOverview = () => {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const { data: resource } = useResource()
  const { data: userProfile } = useUserProfile()
  const sections = useVisibleSettings()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)

  return (
    <Container maxWidth='lg' sx={{ py: { xs: 3, sm: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography level='h2'>{t('overview.title')}</Typography>
        <Typography level='body-md' textColor='text.secondary' sx={{ mt: 1 }}>
          {t('overview.subtitle')}
        </Typography>
      </Box>
      {userProfile &&
        isParentUser(userProfile) &&
        !isPlusAccount(userProfile) && (
          <Sheet
            variant='soft'
            color='primary'
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 'lg',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Star color='primary' />
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography level='title-md'>
                {t('overview.upgrade.title')}
              </Typography>
              <Typography level='body-sm'>
                {t('overview.upgrade.description')}
              </Typography>
            </Box>
            <Button component={Link} to='/settings/account' size='sm'>
              {t('overview.upgrade.button')}
            </Button>
          </Sheet>
        )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: { xs: 3, md: 4 },
          alignItems: 'start',
        }}
      >
        {SETTINGS_GROUPS.map(group => {
          const ids = sections
            .filter(section => section.group === group)
            .map(section => section.id)
          if (!ids.length) return null
          return (
            <Box
              component='section'
              key={group}
              aria-labelledby={`settings-${group}`}
            >
              <Typography
                id={`settings-${group}`}
                level='title-md'
                sx={{ mb: 1.5 }}
              >
                {t(`overview.groups.${group}`)}
              </Typography>
              <SettingsLinks ids={ids} />
            </Box>
          )
        })}
      </Box>
      <Stack
        component='section'
        aria-label={t('overview.support')}
        direction='row'
        useFlexGap
        flexWrap='wrap'
        spacing={1}
        sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Button
          variant='plain'
          color='neutral'
          startDecorator={<Feedback />}
          onClick={() => setFeedbackOpen(true)}
        >
          {t('overview.sections.feedback.title')}
        </Button>
        <Button
          variant='plain'
          color='neutral'
          startDecorator={<ReportProblem />}
          onClick={() => setBugReportOpen(true)}
        >
          {t('overview.sections.bugReport.title')}
        </Button>
      </Stack>
      <Typography
        component='p'
        level='body-xs'
        sx={{ mt: 2, color: 'text.tertiary' }}
      >
        {tCommon('versionInfo', {
          version,
          apiVersion: resource?.api_version || tCommon('apiVersionUnavailable'),
        })}
      </Typography>
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
      <ErrorReportModal
        open={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />
    </Container>
  )
}
export default SettingsOverview
