import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssVarsProvider, CssBaseline, Button } from '@mui/joy'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import chores from '../../public/locales/en/chores.json'
import common from '../../public/locales/en/common.json'
import TemplateLibraryModal from '../../src/views/components/TemplateLibraryModal'
import { KeyboardShortcutScopeProvider } from '../../src/contexts/KeyboardShortcutScopeContext'
import '../../src/index.css'

localStorage.setItem('token', 'ux-review')
localStorage.setItem('token_expiry', '2099-01-01T00:00:00Z')
i18next.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { chores, common } },
  interpolation: { escapeValue: false },
})
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false },
  },
})
client.setQueryData(['userProfile', 'ux-review'], {
  id: 1,
  displayName: 'Alex',
})
client.setQueryData(['allCircleMembers'], {
  res: [
    { userId: 1, displayName: 'Alex' },
    { userId: 2, displayName: 'Sam' },
  ],
})
client.setQueryData(['labels'], [])
client.setQueryData(
  ['projects'],
  [
    { id: 10, name: 'Home', visibility: 'circle' },
    { id: 11, name: 'Private', visibility: 'private', created_by: 1 },
  ],
)
client.setQueryData(['chores', false], { res: [] })
window.reviewClient = client
function App() {
  const [open, setOpen] = useState(true)
  return (
    <CssVarsProvider>
      <CssBaseline />
      <QueryClientProvider client={client}>
        <KeyboardShortcutScopeProvider>
          <div
            style={{ padding: 32, minHeight: '100vh', background: '#eef1f5' }}
          >
            <Button onClick={() => setOpen(true)}>Open library</Button>
            {open && <TemplateLibraryModal onClose={() => setOpen(false)} />}
          </div>
        </KeyboardShortcutScopeProvider>
      </QueryClientProvider>
    </CssVarsProvider>
  )
}
createRoot(document.getElementById('root')).render(<App />)
