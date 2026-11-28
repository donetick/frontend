import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormLabel,
  Input,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import AppModal from '../../components/common/AppModal'
import ModalActions from '../../components/common/ModalActions'
import { useUserProfile } from '../../queries/UserQueries'
import { GetAPITokenScopes } from '../../utils/Fetcher'

const localDateTime = date => {
  const value = new Date(date)
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

const SCOPE_GROUPS = [
  { key: 'tasks', scopes: ['chores:read', 'chores:write', 'chores:execute'] },
  {
    key: 'sensitive',
    scopes: ['chores:delete', 'chores:history:write', 'chores:approve'],
  },
  { key: 'labels', scopes: ['labels:read', 'labels:write', 'labels:delete'] },
  {
    key: 'filters',
    scopes: ['filters:read', 'filters:write', 'filters:delete'],
  },
  {
    key: 'projects',
    scopes: ['projects:read', 'projects:write', 'projects:delete'],
  },
  { key: 'things', scopes: ['things:read', 'things:write'] },
  {
    key: 'rewards',
    scopes: [
      'rewards:read',
      'rewards:write',
      'rewards:delete',
      'rewards:redeem',
      'rewards:approve',
    ],
  },
  { key: 'account', scopes: ['circle:read', 'profile:read'] },
]

// Mounted fresh for each create/edit session: secrets and MFA codes are never persisted.
const APITokenEditor = ({ onClose, onSave, token }) => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  const formId = useId()
  const [name, setName] = useState(token?.name || '')
  const [scopes, setScopes] = useState(token?.scopes || [])
  const [catalog, setCatalog] = useState([])
  const [expiresAt, setExpiresAt] = useState(() =>
    localDateTime(token?.expiresAt || Date.now() + 90 * 86400000),
  )
  const [circleOnly, setCircleOnly] = useState(token?.circleId != null)
  const [mfaCode, setMfaCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    GetAPITokenScopes()
      .then(async response => {
        if (!response.ok) throw new Error(t('apiTokens.loadFailed'))
        const data = await response.json()
        if (!Array.isArray(data.res) || !data.res.length)
          throw new Error(t('apiTokens.loadFailed'))
        if (active) setCatalog(data.res)
      })
      .catch(err => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [attempt, t])

  const submit = async event => {
    event.preventDefault()
    if (saving) return
    if (
      (!token && !name.trim()) ||
      !scopes.length ||
      scopes.some(scope => !catalog.includes(scope)) ||
      !expiresAt ||
      !Number.isFinite(new Date(expiresAt).getTime()) ||
      new Date(expiresAt).getTime() <= Date.now()
    ) {
      setError(t('apiTokens.invalidPermissions'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...(token ? {} : { name: name.trim() }),
        scopes,
        expiresAt: new Date(expiresAt).toISOString(),
        circleId: circleOnly ? userProfile.circleID : null,
        mfaCode,
      })
    } catch (err) {
      setError(err.message || t('apiTokens.saveFailed'))
      setSaving(false)
    }
  }

  return (
    <AppModal
      open
      size='lg'
      title={t(token ? 'apiTokens.editPermissions' : 'apiTokens.generateNew')}
      onClose={() => {
        if (!saving) onClose()
      }}
      showCloseButton={!saving}
      footer={
        <ModalActions
          secondary={{
            label: t('common.cancel'),
            onClick: onClose,
            disabled: saving,
          }}
          primary={{
            label: t(
              token ? 'apiTokens.savePermissions' : 'apiTokens.generateToken',
            ),
            type: 'submit',
            form: formId,
            loading: saving,
            disabled:
              loading || !catalog.length || !userProfile || !scopes.length,
          }}
        />
      }
    >
      <Box
        component='form'
        id={formId}
        onSubmit={submit}
        sx={{ display: 'grid', gap: 2 }}
      >
        {error && (
          <Alert color='danger'>
            {error}
            <Button
              variant='plain'
              onClick={() => setAttempt(value => value + 1)}
              disabled={saving}
            >
              {t('apiTokens.retry')}
            </Button>
          </Alert>
        )}
        {!token && (
          <FormControl required>
            <FormLabel>{t('apiTokens.name')}</FormLabel>
            <Input
              required
              value={name}
              onChange={event => setName(event.target.value)}
              slotProps={{ input: { maxLength: 100 } }}
            />
          </FormControl>
        )}
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography level='title-lg'>
              {t('apiTokens.permissions')}
            </Typography>
            <Chip
              size='sm'
              color={scopes.length ? 'primary' : 'neutral'}
              aria-live='polite'
            >
              {t('apiTokens.selectedCount', { count: scopes.length })}
            </Chip>
          </Box>

          {!loading && (
            <AccordionGroup
              variant='outlined'
              transition='0.15s'
              sx={{
                borderRadius: 'md',
                overflow: 'hidden',
                '& > div': {
                  '&:not(:last-child)': {
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  },
                },
              }}
            >
              {[
                ...SCOPE_GROUPS,
                {
                  key: 'other',
                  scopes: catalog.filter(
                    scope =>
                      !SCOPE_GROUPS.some(group => group.scopes.includes(scope)),
                  ),
                },
              ].map(group => {
                const available = group.scopes.filter(scope =>
                  catalog.includes(scope),
                )
                if (!available.length) return null
                const selectedInGroup = available.filter(scope =>
                  scopes.includes(scope),
                ).length
                const allSelected = selectedInGroup === available.length
                const groupSensitive = group.key === 'sensitive'
                return (
                  <Accordion
                    key={group.key}
                    defaultExpanded={!!selectedInGroup}
                  >
                    <AccordionSummary>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Checkbox
                          size='sm'
                          checked={allSelected}
                          indeterminate={selectedInGroup > 0 && !allSelected}
                          disabled={saving}
                          color={groupSensitive ? 'warning' : 'primary'}
                          onClick={event => event.stopPropagation()}
                          onChange={event =>
                            setScopes(current => {
                              const withoutGroup = current.filter(
                                scope => !available.includes(scope),
                              )
                              return event.target.checked
                                ? [...withoutGroup, ...available]
                                : withoutGroup
                            })
                          }
                        />
                        <Typography level='title-sm' sx={{ flex: 1 }}>
                          {t(`apiTokens.scopeGroups.${group.key}`)}
                        </Typography>
                        {selectedInGroup > 0 && (
                          <Chip
                            size='sm'
                            variant='soft'
                            color={groupSensitive ? 'warning' : 'primary'}
                          >
                            {selectedInGroup}/{available.length}
                          </Chip>
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'grid', gap: 1, pt: 0.5 }}>
                        {available.map(scope => {
                          const selected = scopes.includes(scope)
                          const sensitive =
                            groupSensitive || scope.endsWith(':delete')
                          return (
                            <Box
                              key={scope}
                              sx={{
                                border: '1px solid',
                                borderColor: selected
                                  ? sensitive
                                    ? 'warning.outlinedBorder'
                                    : 'primary.outlinedBorder'
                                  : 'divider',
                                bgcolor: selected
                                  ? sensitive
                                    ? 'warning.softBg'
                                    : 'primary.softBg'
                                  : 'background.surface',
                                borderRadius: 'md',
                                p: 1.5,
                              }}
                            >
                              <Checkbox
                                checked={selected}
                                disabled={saving}
                                color={sensitive ? 'warning' : 'primary'}
                                sx={{
                                  width: '100%',
                                  alignItems: 'flex-start',
                                  '& .MuiCheckbox-label': { flex: 1 },
                                }}
                                onChange={event =>
                                  setScopes(current =>
                                    event.target.checked
                                      ? [...current, scope]
                                      : current.filter(
                                          value => value !== scope,
                                        ),
                                  )
                                }
                                label={
                                  <Box sx={{ display: 'grid', gap: 0.5 }}>
                                    <Typography level='title-sm'>
                                      {t(`apiTokens.scopeLabels.${scope}`, {
                                        defaultValue: scope,
                                        nsSeparator: false,
                                      })}
                                    </Typography>
                                    <Typography level='body-xs'>
                                      {t(
                                        `apiTokens.scopeDescriptions.${scope}`,
                                        {
                                          defaultValue: t(
                                            'apiTokens.otherScopeDescription',
                                          ),
                                          nsSeparator: false,
                                        },
                                      )}
                                    </Typography>
                                    <Typography
                                      level='body-xs'
                                      fontFamily='monospace'
                                      sx={{ opacity: 0.7 }}
                                    >
                                      {scope}
                                    </Typography>
                                  </Box>
                                }
                              />
                            </Box>
                          )
                        })}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )
              })}
            </AccordionGroup>
          )}
          <Typography level='body-xs'>{t('apiTokens.scopeHelp')}</Typography>
        </Box>
        <FormControl required>
          <FormLabel>{t('apiTokens.expiresAt')}</FormLabel>
          <Input
            type='datetime-local'
            required
            value={expiresAt}
            onChange={event => setExpiresAt(event.target.value)}
          />
        </FormControl>
        <Checkbox
          label={t('apiTokens.currentCircleOnly')}
          checked={circleOnly}
          disabled={!userProfile?.circleID || saving}
          onChange={event => setCircleOnly(event.target.checked)}
        />
        {token?.circleId != null &&
          token.circleId !== userProfile?.circleID && (
            <Alert color='warning'>{t('apiTokens.circleChanged')}</Alert>
          )}
        {userProfile?.mfaEnabled && (
          <FormControl required>
            <FormLabel>{t('apiTokens.mfaCode')}</FormLabel>
            <Input
              required
              autoComplete='one-time-code'
              value={mfaCode}
              onChange={event => setMfaCode(event.target.value)}
            />
          </FormControl>
        )}
      </Box>
    </AppModal>
  )
}

APITokenEditor.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  token: PropTypes.shape({
    name: PropTypes.string,
    scopes: PropTypes.arrayOf(PropTypes.string),
    expiresAt: PropTypes.string,
    circleId: PropTypes.number,
    legacyUnrestricted: PropTypes.bool,
  }),
}

export default APITokenEditor
