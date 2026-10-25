import { ChevronRight } from '@mui/icons-material'
import {
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Typography,
  useColorScheme,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useUserProfile } from '../../queries/UserQueries'
import { useVisibleSettings } from './useVisibleSettings'

const SettingsLinks = ({ ids }) => {
  const { t } = useTranslation('settings')
  const { mode } = useColorScheme()
  const { data: userProfile } = useUserProfile()
  const targetType = String(userProfile?.notification_target?.type ?? 0)
  const serviceKeys = {
    1: 'targetTelegram',
    2: 'targetPushover',
    3: 'targetWebhooks',
  }
  const summary = id => {
    if (id === 'theme' && ['light', 'dark', 'system'].includes(mode))
      return t(`theme.${mode}`)
    if (id === 'notification-integrations' && serviceKeys[targetType])
      return t(`notifications.${serviceKeys[targetType]}`)
    return null
  }
  const sections = useVisibleSettings().filter(section =>
    ids.includes(section.id),
  )
  if (!sections.length) return null
  return (
    <List
      sx={{
        '--List-gap': '0px',
        '--ListItem-radius': '0px',
        '--ListItem-paddingY': '0px',
        '--ListItem-paddingLeft': '0px',
        '--ListItem-paddingRight': '0px',
        p: 0,
        minWidth: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 'lg',
        overflow: 'hidden',
        bgcolor: 'background.surface',
      }}
    >
      {sections.map(({ icon: Icon, id, isBeta }, index) => (
        <ListItem
          key={id}
          sx={{
            '--ListItemButton-marginInline': '0px',
            '--ListItemButton-marginBlock': '0px',
            p: 0,
            minWidth: 0,
            borderTop: index ? '1px solid' : 'none',
            borderColor: 'divider',
            borderRadius: 0,
          }}
        >
          <ListItemButton
            component={Link}
            to={`/settings/${id}`}
            sx={{
              m: 0,
              borderRadius: 0,
              width: '100%',
              minWidth: 0,
              px: { xs: 2, sm: 2.5 },
              py: 2,
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <ListItemDecorator
              sx={{
                alignSelf: 'flex-start',
                pt: 0.25,
                minInlineSize: 28,
                color: 'primary.500',
              }}
            >
              <Icon />
            </ListItemDecorator>
            <ListItemContent sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography level='title-sm' sx={{ minWidth: 0 }}>
                  {t(`overview.sections.${id}.title`)}
                </Typography>
                {summary(id) && (
                  <Chip size='sm' variant='soft'>
                    {summary(id)}
                  </Chip>
                )}
                {isBeta && (
                  <Chip size='sm' variant='soft' color='warning'>
                    {t('common.earlyAccess')}
                  </Chip>
                )}
              </Box>
              <Typography
                level='body-sm'
                textColor='text.secondary'
                sx={{ mt: 0.5, whiteSpace: 'normal' }}
              >
                {t(`overview.sections.${id}.description`)}
              </Typography>
            </ListItemContent>
            <ChevronRight sx={{ color: 'text.tertiary', flexShrink: 0 }} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  )
}
SettingsLinks.propTypes = {
  ids: PropTypes.arrayOf(PropTypes.string).isRequired,
}
export default SettingsLinks
