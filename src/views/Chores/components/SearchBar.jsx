import { CancelRounded } from '@mui/icons-material'
import { Box, Input } from '@mui/joy'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'

const SearchBar = ({
  value,
  onChange,
  onClose,
  onFocus,
  showKeyboardShortcuts,
  inputRef,
}) => {
  return (
    <Input
      slotProps={{ input: { ref: inputRef } }}
      placeholder='Search'
      value={value}
      onFocus={onFocus}
      fullWidth
      sx={{
        mt: 1,
        mb: 1,
        borderRadius: 24,
        height: 24,
        borderColor: 'text.disabled',
        padding: 1,
      }}
      onChange={onChange}
      startDecorator={
        <KeyboardShortcutHint shortcut='F' show={showKeyboardShortcuts} />
      }
      endDecorator={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {value && (
            <>
              <KeyboardShortcutHint shortcut='X' show={showKeyboardShortcuts} />
              <CancelRounded onClick={onClose} />
            </>
          )}
        </Box>
      }
    />
  )
}

export default SearchBar
