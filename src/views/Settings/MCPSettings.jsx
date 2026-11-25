import { CopyAll, OpenInNew } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Link,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'

import { PAYWALL_REASON, usePaywall } from '../../contexts/PaywallContext'
import { useUserProfile } from '../../queries/UserQueries'
import { isCloudInstance } from '../../service/FeedbackService'
import { useNotification } from '../../service/NotificationProvider'
import { apiClient } from '../../utils/ApiClient'
import { copyText } from '../../utils/Clipboard'
import { openExternalLink } from '../../utils/ExternalLinks'
import { CreateLongLiveToken } from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import APITokenEditor from './APITokenEditor'
import SettingsLayout from './SettingsLayout'
import SettingsSection from './SettingsSection'

const DOCS_URL = 'https://github.com/donetick/donetick#mcp-server'

// Drives both the tab strip and its panels, so a client is added in one place.
// Each key resolves to `mcp.clients.<key>` for the label and `<key>Hint` for
// the line above the snippet.
const CLIENTS = [
  { key: 'claudeCode', snippet: 'claudeCode' },
  { key: 'claudeDesktop', snippet: 'claudeDesktop' },
  { key: 'muse', snippet: 'muse', wrap: true },
  // Not a client: the generic instructions plus a curl to prove the endpoint
  // answers, which is also the first thing to try when a client will not connect.
  { key: 'other', snippet: 'verify' },
]

// The MCP endpoint sits at the root of the server, while the API client's URL
// points inside the API ("<server>/api/v1"), so both suffixes come off again.
const buildMcpURL = apiURL => {
  let base = String(apiURL || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v\d+$/, '')
    .replace(/\/api$/, '')
  if (!base) return `${window.location.origin}/mcp`
  if (!/^https?:\/\//i.test(base)) {
    base = `${window.location.protocol}//${base}`
  }
  return `${base}/mcp`
}

const TOKEN_PLACEHOLDER = '<your-api-token>'

// Addresses only reachable from the same network, which rules out any assistant
// that connects from the cloud. Hostnames without a dot are counted too: a bare
// "donetick" or "nas" only resolves on a local DNS.
const isLocalURL = url => {
  let host
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return false
  }
  return (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.lan') ||
    host.endsWith('.internal') ||
    !host.includes('.') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  )
}

// `wrap` is for prose to copy rather than code: a sentence has no meaningful
// line breaks, so it reflows instead of scrolling off to the right.
const CodeBlock = ({ code, label, wrap = false }) => {
  const { t } = useTranslation('settings')
  const { showNotification } = useNotification()
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component='pre'
        sx={{
          m: 0,
          p: 1.5,
          pr: 6,
          borderRadius: 'md',
          bgcolor: 'background.level1',
          border: '1px solid',
          borderColor: 'divider',
          fontSize: 'xs',
          fontFamily: wrap ? 'body' : 'monospace',
          lineHeight: wrap ? 'md' : undefined,
          overflowX: 'auto',
          whiteSpace: wrap ? 'pre-wrap' : 'pre',
          // A server URL has nowhere to wrap, so let it break mid-word rather
          // than widen the block past the card.
          overflowWrap: wrap ? 'anywhere' : undefined,
        }}
      >
        {code}
      </Box>
      <IconButton
        size='sm'
        variant='soft'
        color='primary'
        aria-label={label}
        sx={{ position: 'absolute', top: 8, right: 8 }}
        onClick={async () => {
          if (!(await copyText(code))) return
          showNotification({
            type: 'success',
            message: t('mcp.copied'),
          })
        }}
      >
        <CopyAll />
      </IconButton>
    </Box>
  )
}
CodeBlock.propTypes = {
  code: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  wrap: PropTypes.bool,
}

const MCPSettings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  // null until the stored server URL has been read; the self-hosted notes
  // below wait for a definite answer rather than flashing in on cloud.
  const [isCloud, setIsCloud] = useState(null)
  const { showPaywall } = usePaywall()
  const { showNotification } = useNotification()
  const [token, setToken] = useState('')
  const [createdToken, setCreatedToken] = useState(null)
  const [isNameModalOpen, setIsNameModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    isCloudInstance().then(result => {
      if (!cancelled) setIsCloud(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const serverURL = buildMcpURL(apiClient.getApiURL())
  // Snippets stay copyable before a token exists: the placeholder shows the
  // reader exactly which part is theirs to replace.
  const secret = token.trim() || TOKEN_PLACEHOLDER

  const handleCreateToken = async payload => {
    const response = await CreateLongLiveToken(payload)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || t('mcp.tokenFailed'))
    setCreatedToken(data.res?.token ?? null)
    setToken(data.res?.token ?? '')
    setIsNameModalOpen(false)
  }

  const snippets = {
    claudeCode: `claude mcp add --transport http donetick ${serverURL} \\
  --header "secretkey: ${secret}"`,
    claudeDesktop: `{
  "mcpServers": {
    "donetick": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${serverURL}",
        "--header",
        "secretkey: ${secret}"
      ]
    }
  }
}`,
    // Muse has no config file to edit: it sets up its own custom connector from
    // a plain request. Deliberately token-free, because Muse collects the token
    // through its secure setup and pasting one into a chat is what we avoid.
    // One line once copied; split here only to stay inside the line length.
    muse: [
      `Add Donetick to Muse. Connect to my Donetick MCP server at ${serverURL}`,
      '(Streamable HTTP). Authenticate with a Donetick API token in the',
      '`secretkey` header. Ask me for the token through your secure setup,',
      'never ask me to paste it here. Register it as custom connector',
      'custom.donetick, list the available tools, and confirm the connection',
      'with a read-only list_chores call.',
    ].join(' '),
    verify: `curl -X POST ${serverURL} \\
  -H "secretkey: ${secret}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
  }

  const toolGroups = ['tasks', 'labels', 'projects', 'filters', 'things']

  return (
    <SettingsLayout title={t('overview.sections.mcp.title')}>
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <SettingsSection
          title={t('mcp.about.title')}
          description={t('mcp.about.description')}
        >
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {toolGroups.map(group => (
                <Chip key={group} size='sm' variant='soft'>
                  {t(`mcp.about.tools.${group}`)}
                </Chip>
              ))}
            </Box>
            <Typography level='body-sm' textColor='text.secondary'>
              {t('mcp.about.permissions')}
            </Typography>
            <Link
              level='body-sm'
              href={DOCS_URL}
              target='_blank'
              rel='noopener noreferrer'
              endDecorator={<OpenInNew sx={{ fontSize: 16 }} />}
              // The in-app browser, so the link also works in the native apps.
              onClick={event => {
                event.preventDefault()
                openExternalLink(DOCS_URL)
              }}
              sx={{ justifySelf: 'start' }}
            >
              {t('mcp.about.docs')}
            </Link>
          </Box>
        </SettingsSection>

        {isCloud === false && (
          <SettingsSection
            title={t('mcp.enable.title')}
            description={t('mcp.enable.description')}
          >
            <CodeBlock
              code={'mcp:\n  enabled: true'}
              label={t('mcp.copyConfig')}
            />
            <Typography
              level='body-xs'
              textColor='text.secondary'
              sx={{ mt: 1 }}
            >
              {t('mcp.enable.envVar')}
            </Typography>
            <Box sx={{ display: 'grid', gap: 0.5, mt: 2 }}>
              <Typography level='title-sm'>
                {t('mcp.enable.publicTitle')}
              </Typography>
              <Typography level='body-sm' textColor='text.secondary'>
                {t('mcp.enable.public')}
              </Typography>
              {isLocalURL(serverURL) && (
                <Alert color='warning' variant='soft' sx={{ mt: 0.5 }}>
                  <Typography level='body-xs'>
                    {t('mcp.enable.publicUrl')}
                  </Typography>
                </Alert>
              )}
            </Box>
          </SettingsSection>
        )}

        <SettingsSection
          title={t('mcp.token.title')}
          description={t('mcp.token.description')}
        >
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'center',
              }}
            >
              <Button
                variant='soft'
                color='primary'
                onClick={() => {
                  if (!isPlusAccount(userProfile)) {
                    showPaywall(PAYWALL_REASON.API_TOKENS)
                    return
                  }
                  setIsNameModalOpen(true)
                }}
              >
                {t('mcp.token.generate')}
              </Button>
              <Link
                component={RouterLink}
                to='/settings/apitokens'
                level='body-sm'
              >
                {t('mcp.token.manage')}
              </Link>
            </Box>
            {/* One field for both paths: a token just created lands here, and
                an older one can be pasted in. Either way the examples below
                stop being templates and become ready to paste. */}
            <FormControl>
              <FormLabel>{t('mcp.token.fillLabel')}</FormLabel>
              <Input
                value={token}
                onChange={event => setToken(event.target.value)}
                placeholder={TOKEN_PLACEHOLDER}
                autoComplete='off'
                spellCheck={false}
                sx={{ fontFamily: 'monospace' }}
                endDecorator={
                  <IconButton
                    variant='outlined'
                    color='primary'
                    disabled={!token.trim()}
                    aria-label={t('apiTokens.copyToken')}
                    onClick={async () => {
                      if (!(await copyText(token))) return
                      showNotification({
                        type: 'success',
                        message: t('apiTokens.tokenCopied'),
                      })
                    }}
                  >
                    <CopyAll />
                  </IconButton>
                }
              />
              <FormHelperText>{t('mcp.token.fillHint')}</FormHelperText>
            </FormControl>
            {createdToken && (
              <Alert color='warning' variant='soft'>
                <Typography level='body-xs'>
                  {t('apiTokens.tokenCreatedWarning')}
                </Typography>
              </Alert>
            )}
          </Box>
        </SettingsSection>

        <SettingsSection
          title={t('mcp.connect.title')}
          description={t('mcp.connect.description')}
        >
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <FormControl>
              <FormLabel>{t('mcp.connect.serverUrl')}</FormLabel>
              <Input
                value={serverURL}
                readOnly
                sx={{ fontFamily: 'monospace' }}
                endDecorator={
                  <IconButton
                    variant='outlined'
                    color='primary'
                    aria-label={t('mcp.connect.copyUrl')}
                    onClick={async () => {
                      if (!(await copyText(serverURL))) return
                      showNotification({
                        type: 'success',
                        message: t('mcp.copied'),
                      })
                    }}
                  >
                    <CopyAll />
                  </IconButton>
                }
              />
              <FormHelperText>{t('mcp.connect.transport')}</FormHelperText>
            </FormControl>
            <Tabs
              defaultValue='claudeCode'
              size='sm'
              sx={{
                bgcolor: 'background.level1',
                borderRadius: 'lg',
                p: 0.5,
              }}
            >
              {/* The pills wrap on narrow screens rather than scroll, so every
                  client stays reachable without a horizontal swipe. */}
              <TabList
                disableUnderline
                sx={{ flexWrap: 'wrap', gap: 0.5, '--Tabs-spacing': '0px' }}
              >
                {CLIENTS.map(({ key }) => (
                  <Tab
                    key={key}
                    value={key}
                    disableIndicator
                    sx={{
                      borderRadius: 'md',
                      flex: 'auto',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      '&.Mui-selected': {
                        bgcolor: 'background.surface',
                        boxShadow: 'sm',
                      },
                    }}
                  >
                    {t(`mcp.clients.${key}`)}
                  </Tab>
                ))}
              </TabList>
              {CLIENTS.map(({ key, snippet, wrap }) => (
                <TabPanel
                  key={key}
                  value={key}
                  sx={{ px: 0, pb: 0.5, '--Tabs-spacing': '0px' }}
                >
                  {/* minWidth lets the snippet scroll inside this column; a
                      grid item would otherwise stretch to its content. */}
                  <Box sx={{ display: 'grid', gap: 1, pt: 1.5, minWidth: 0 }}>
                    <Typography level='body-sm' textColor='text.secondary'>
                      {t(`mcp.clients.${key}Hint`)}
                    </Typography>
                    <CodeBlock
                      code={snippets[snippet]}
                      label={t('mcp.copySnippet')}
                      wrap={wrap}
                    />
                  </Box>
                </TabPanel>
              ))}
            </Tabs>
          </Box>
        </SettingsSection>
      </Box>

      {isNameModalOpen && (
        <APITokenEditor
          onClose={() => setIsNameModalOpen(false)}
          onSave={handleCreateToken}
        />
      )}
    </SettingsLayout>
  )
}

export default MCPSettings
