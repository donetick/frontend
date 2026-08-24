import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Link,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { authButtonSx, authInputSx } from './authStyles'

const labelSx = { fontSize: '0.875rem', fontWeight: 600, mb: 0.75 }

export const AuthField = ({ children, error, helper, label, ...formProps }) => (
  <FormControl error={Boolean(error)} {...formProps}>
    <FormLabel sx={labelSx}>{label}</FormLabel>
    {children}
    {(error || helper) && (
      <FormHelperText
        sx={{
          fontSize: '0.8125rem',
          color: error ? 'danger.plainColor' : 'text.secondary',
        }}
      >
        {error || helper}
      </FormHelperText>
    )}
  </FormControl>
)

export const AuthTextField = ({ error, helper, label, sx, ...inputProps }) => (
  <AuthField label={label} error={error} helper={helper} id={inputProps.id}>
    <Input size='lg' sx={{ ...authInputSx, ...sx }} {...inputProps} />
  </AuthField>
)

export const AuthPasswordField = ({
  error,
  helper,
  label,
  sx,
  ...inputProps
}) => {
  const { t } = useTranslation('auth')
  const [visible, setVisible] = useState(false)

  return (
    <AuthField label={label} error={error} helper={helper} id={inputProps.id}>
      <Input
        size='lg'
        type={visible ? 'text' : 'password'}
        sx={{ ...authInputSx, ...sx }}
        endDecorator={
          <IconButton
            variant='plain'
            color='neutral'
            size='sm'
            tabIndex={-1}
            aria-label={visible ? t('hidePassword') : t('showPassword')}
            onClick={() => setVisible(v => !v)}
            sx={{ borderRadius: '8px' }}
          >
            {visible ? (
              <VisibilityOffOutlined fontSize='small' />
            ) : (
              <VisibilityOutlined fontSize='small' />
            )}
          </IconButton>
        }
        {...inputProps}
      />
    </AuthField>
  )
}

export const AuthSubmitButton = ({ children, sx, ...props }) => (
  <Button
    type='submit'
    size='lg'
    variant='solid'
    fullWidth
    sx={{ ...authButtonSx, ...sx }}
    {...props}
  >
    {children}
  </Button>
)

export const SocialButton = ({ children, icon, sx, ...props }) => (
  <Button
    type='button'
    size='lg'
    variant='outlined'
    color='neutral'
    fullWidth
    startDecorator={icon}
    sx={{
      ...authButtonSx,
      fontWeight: 500,
      justifyContent: 'center',
      ...sx,
    }}
    {...props}
  >
    {children}
  </Button>
)

export const AuthDivider = ({ children }) => {
  const { t } = useTranslation('auth')

  return (
    <Box
      role='separator'
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        my: 2.5,
        '&::before, &::after': {
          content: '""',
          flex: 1,
          height: '1px',
          bgcolor: 'divider',
        },
      }}
    >
      <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
        {children ?? t('or')}
      </Typography>
    </Box>
  )
}

export const LegalLinks = () => {
  const { t } = useTranslation('auth')
  return (
    <Typography
      level='body-xs'
      sx={{ textAlign: 'center', color: 'text.secondary' }}
    >
      <Link
        href='https://donetick.com/privacy'
        target='_blank'
        rel='noopener'
        color='neutral'
        underline='hover'
      >
        {t('privacyPolicy')}
      </Link>
      {' · '}
      <Link
        href='https://donetick.com/terms'
        target='_blank'
        rel='noopener'
        color='neutral'
        underline='hover'
      >
        {t('termsOfUse')}
      </Link>
    </Typography>
  )
}
