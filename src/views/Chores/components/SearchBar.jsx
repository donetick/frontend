import { CancelRounded, SearchRounded } from '@mui/icons-material'
import { Box, Input } from '@mui/joy'

import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import { useGlobalSearch } from '../../../search/GlobalSearchContext'

const SearchBar = ({
  inputRef,
  onChange,
  onClose,
  onFocus,
  showKeyboardShortcuts,
  value,
}) => {
  const { openSearch } = useGlobalSearch()
  const handleOpen = () => {
    onFocus?.()
    openSearch(value)
  }

  return (
    <Input
      slotProps={{ input: { ref: inputRef, readOnly: true } }}
      placeholder='Search Donetick'
      value={value}
      onFocus={handleOpen}
      onMouseDown={event => {
        event.preventDefault()
        handleOpen()
      }}
      fullWidth
      sx={{
        mt: 1,
        mb: 1,
        borderRadius: 24,
        height: 24,
        borderColor: 'text.disabled',
        padding: 1,
        cursor: 'pointer',
        '& input': { cursor: 'pointer' },
      }}
      onChange={onChange}
      startDecorator={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <SearchRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
          <KeyboardShortcutHint shortcut='F' show={showKeyboardShortcuts} />
        </Box>
      }
      endDecorator={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {value && (
            <>
              <KeyboardShortcutHint shortcut='X' show={showKeyboardShortcuts} />
              <CancelRounded
                aria-label='Clear task search'
                onMouseDown={event => event.stopPropagation()}
                onClick={event => {
                  event.stopPropagation()
                  onClose()
                }}
              />
            </>
          )}
        </Box>
      }
    />
  )
}

export default SearchBar
