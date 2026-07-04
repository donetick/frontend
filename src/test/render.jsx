import { CssVarsProvider } from '@mui/joy/styles'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Renders a component inside the app's MUI Joy theme provider and returns a
// pre-wired `user` (user-event) instance. Add more global providers here
// (router, react-query, i18n) as integration tests start needing them.
export function renderWithProviders(ui, options = {}) {
  const user = userEvent.setup()
  const result = render(ui, {
    wrapper: ({ children }) => <CssVarsProvider>{children}</CssVarsProvider>,
    ...options,
  })
  return { user, ...result }
}

export * from '@testing-library/react'
