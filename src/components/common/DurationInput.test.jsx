import { axe } from 'vitest-axe'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen } from '../../test/render'
import DurationInput from './DurationInput'

// Component/integration test: renders the real component in the app theme and
// drives it the way a user would (clicking buttons), asserting user-observable
// behaviour and the onChange contract — not internal state. See TESTING.md.

describe('DurationInput', () => {
  it('renders the current duration derived from seconds', () => {
    renderWithProviders(<DurationInput value={3600} onChange={() => {}} />)
    // 3600s → "1" with the Hours unit selected.
    expect(screen.getByRole('spinbutton')).toHaveValue(1)
    expect(screen.getByRole('combobox')).toHaveTextContent(/hours/i)
  })

  it('emits the new duration in seconds when incrementing', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(<DurationInput value={3600} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /increase duration/i }))

    // 1h → 2h = 7200 seconds.
    expect(onChange).toHaveBeenLastCalledWith(7200)
  })

  it('disables decrement at the minimum value so it cannot go lower', () => {
    // value 60s = 1 minute, at minValue 1 → a user cannot decrement below it.
    renderWithProviders(<DurationInput value={60} onChange={() => {}} minValue={1} />)
    expect(screen.getByRole('button', { name: /decrease duration/i })).toBeDisabled()
  })

  it('has no automatically-detectable accessibility violations', async () => {
    const { container } = renderWithProviders(
      <DurationInput value={3600} onChange={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
