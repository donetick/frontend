import '../../src/i18n/config'
import '../../src/index.css'

import {
  Autocomplete,
  Button,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  Option,
  Select,
  Snackbar,
} from '@mui/joy'
import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

import AppModal from '../../src/components/common/AppModal'
import { LocalizationProvider } from '../../src/contexts/LocalizationContext'
import ThemeContext from '../../src/contexts/ThemeContext'

function Fixture() {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(false)
  window.setMotionModalOpen = setOpen
  return (
    <main style={{ padding: 32, display: 'flex', gap: 16 }}>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dropdown>
        <MenuButton>Actions</MenuButton>
        <Menu placement='bottom-end'>
          <MenuItem>First action</MenuItem>
          <MenuItem>Second action</MenuItem>
        </Menu>
      </Dropdown>
      <Select placeholder='Choose option' aria-label='Choose option'>
        <Option value='one'>Option one</Option>
        <Option value='two'>Option two</Option>
      </Select>
      <Autocomplete
        placeholder='Search options'
        options={['Apple', 'Banana']}
      />
      <Button onClick={() => setToast(true)}>Show toast</Button>
      <Snackbar open={toast} onClose={() => setToast(false)}>
        Task saved
        <Button onClick={() => setToast(false)}>Dismiss toast</Button>
      </Snackbar>
      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title='Motion dialog'
        showHandle
      >
        <input aria-label='Task name' />
        <Button onClick={() => setOpen(false)}>Done</Button>
      </AppModal>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocalizationProvider>
      <ThemeContext>
        <Fixture />
      </ThemeContext>
    </LocalizationProvider>
  </StrictMode>,
)
