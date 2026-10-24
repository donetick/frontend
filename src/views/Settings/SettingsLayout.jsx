import { Box, Breadcrumbs, Container, Link, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'

import { SETTINGS_SECTIONS } from '../../constants/settingsSections'
import SettingsLinks from './SettingsLinks'

const SettingsLayout = ({ children, title }) => {
  const { t } = useTranslation('settings')
  const { pathname } = useLocation()
  const id = pathname.split('/').filter(Boolean).at(-1)
  const section = SETTINGS_SECTIONS.find(section => section.id === id)
  const parent = SETTINGS_SECTIONS.find(item => item.id === section?.parent)
  const related = SETTINGS_SECTIONS.filter(item => item.parent === id).map(
    item => item.id,
  )

  return (
    <Container maxWidth='lg'>
      <Box sx={{ py: { xs: 2, sm: 3 } }}>
        <Breadcrumbs
          aria-label={t('navigation.breadcrumbs')}
          sx={{ px: 0, mb: 2, fontSize: 'sm' }}
        >
          <Link component={RouterLink} to='/settings'>
            {t('overview.title')}
          </Link>
          {parent && (
            <Link component={RouterLink} to={`/settings/${parent.id}`}>
              {t(`overview.sections.${parent.id}.title`)}
            </Link>
          )}
          <Typography level='body-sm' aria-current='page'>
            {section ? t(`overview.sections.${id}.title`) : title}
          </Typography>
        </Breadcrumbs>
        <Typography level='h2' sx={{ mb: 3 }}>
          {section ? t(`overview.sections.${id}.title`) : title}
        </Typography>
        {related.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <SettingsLinks ids={related} />
          </Box>
        )}
        {children}
      </Box>
    </Container>
  )
}
SettingsLayout.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string.isRequired,
}
export default SettingsLayout
