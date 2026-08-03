import './SmartTaskTitleInput.css'

import { CameraEnhance, Mic, PhotoFilter } from '@mui/icons-material'
import { IconButton, Tooltip, useColorScheme } from '@mui/joy'
import { useEffect, useRef, useState } from 'react'

import AutocompleteDropdown from '../TestView/AutocompleteDropdown'
const renderHighlightedText = (text, cursorPosition) => {
  const parts = []
  let lastIndex = 0

  const regex = /(Tomorrow)|(Every\s+\d+\s+\w+s?)|(#\w+)|(P\d+)/gi
  let match

  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0]
    const matchIndex = match.index

    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex))
    }

    let className = ''
    if (matchedText.toLowerCase() === 'tomorrow') {
      className = 'highlight-date'
    } else if (matchedText.toLowerCase().startsWith('every')) {
      className = 'highlight-repeat'
    } else if (matchedText.startsWith('#')) {
      className = 'highlight-label'
    } else if (matchedText.startsWith('P')) {
      className = 'highlight-priority'
    }

    parts.push(
      <span key={matchIndex} className={className}>
        {matchedText}
      </span>,
    )

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}

const SmartTaskTitleInput = ({
  autoFocus,
  customRenderer,
  isNativeScanner,
  onChange,
  onEnterPressed,
  onPhotoSelected,
  onScanClick,
  onShiftEnterPressed,
  onVoiceClick,
  placeholder,
  suggestions,
  value,
}) => {
  const { mode, setMode } = useColorScheme()
  const titleInputRef = useRef(null)
  const photoInputRef = useRef(null)
  const [cursorPosition, setCursorPosition] = useState(value?.length)
  const dropdownRef = useRef(null)
  const [lastWord, setLastWord] = useState('')
  const [suggestionTrigger, setSuggestionTrigger] = useState('P')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)

  useEffect(() => {
    setCursorPosition(prevPos => Math.min(prevPos, value.length))

    if (
      titleInputRef.current &&
      document.activeElement === titleInputRef.current
    ) {
      requestAnimationFrame(() => {
        titleInputRef.current.setSelectionRange(cursorPosition, cursorPosition)
      })
    }
  }, [value])
  useEffect(() => {
    // set focus on the input when the component is mounted:
    if (titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }
  }, [])
  const handleSuggestionChange = text => {
    // if the last word start with '@' or '#' or 'P':
    const lastWord = text.split(' ').pop()
    if (
      lastWord.startsWith('@') ||
      lastWord.startsWith('#') ||
      lastWord.startsWith('!')
    ) {
      setSuggestionTrigger(lastWord[0])
      // last word without the first character:
      setLastWord(lastWord.slice(1))

      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleTextareaChange = e => {
    handleSuggestionChange(e.target.value)
    onChange(e.target.value)
    setCursorPosition(e.target.selectionStart)
  }

  const selectSuggestionText = suggestionValue => {
    const newValue = `${value.slice(0, cursorPosition - lastWord.length)}${suggestionValue} ${value.slice(cursorPosition)}`
    onChange(newValue)
    titleInputRef.current.value = newValue

    setShowSuggestions(false)

    const newCursorPosition =
      cursorPosition - lastWord.length + suggestionValue.length + 1
    titleInputRef.current.setSelectionRange(
      newCursorPosition,
      newCursorPosition,
    )
  }

  const handleTextareaKeyDown = e => {
    if (showSuggestions) {
      const activeSuggestions = suggestions[suggestionTrigger]
      const currentSuggestions = activeSuggestions.options.filter(option => {
        if (typeof option === 'string') {
          return option.toLowerCase().includes(lastWord.toLowerCase())
        }
        return option[activeSuggestions.display]
          .toLowerCase()
          .includes(lastWord.toLowerCase())
      })

      const trimmedWord = lastWord.trim()
      const hasExactMatch = currentSuggestions.some(option => {
        const optionText = activeSuggestions.display
          ? option[activeSuggestions.display]
          : option
        return optionText.toLowerCase() === trimmedWord.toLowerCase()
      })
      const showCreateOption =
        activeSuggestions.creatable && trimmedWord.length > 0 && !hasExactMatch
      const optionCount = currentSuggestions.length + (showCreateOption ? 1 : 0)

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (optionCount === 0) return
        const newIndex =
          e.key === 'ArrowDown'
            ? (selectedSuggestionIndex + 1) % optionCount
            : (selectedSuggestionIndex - 1 + optionCount) % optionCount
        setSelectedSuggestionIndex(newIndex)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (
          showCreateOption &&
          selectedSuggestionIndex === currentSuggestions.length
        ) {
          e.preventDefault()
          selectSuggestionText(trimmedWord)
          activeSuggestions.onCreate?.(trimmedWord)
          return
        }

        const selectedSuggestion = currentSuggestions[selectedSuggestionIndex]
        const suggestionValue = activeSuggestions.display
          ? selectedSuggestion?.[activeSuggestions.display]
          : selectedSuggestion

        if (suggestionValue) {
          e.preventDefault()
          selectSuggestionText(suggestionValue)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(false)
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          if (onShiftEnterPressed) {
            onShiftEnterPressed(value)
          }
        } else if (onEnterPressed) {
          onEnterPressed(value)
        }
      }
    }

    const currentPos = e.target.selectionStart
    setCursorPosition(currentPos)
  }

  const handleTextareaClick = e => {
    const currentPos = e.target.selectionStart
    setCursorPosition(currentPos)
  }

  const handleDisplayClick = e => {
    const range = document.caretRangeFromPoint(e.clientX, e.clientY)
    if (range) {
      const offset = range.startOffset
      setCursorPosition(offset)

      if (titleInputRef.current) {
        titleInputRef.current.focus()
        titleInputRef.current.setSelectionRange(offset, offset)
      }
    }
  }

  const handlePhotoInputChange = e => {
    const file = e.target.files?.[0]
    if (!file || !onPhotoSelected) return
    const reader = new FileReader()
    reader.onload = ev => onPhotoSelected(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const showPhotoButtons = isNativeScanner && !value
  const showVoiceButton = !!onVoiceClick && !value
  const visibleButtonCount =
    (showPhotoButtons && onPhotoSelected ? 1 : 0) +
    (showPhotoButtons && onScanClick ? 1 : 0) +
    (showVoiceButton ? 1 : 0)
  const showActionButtons = visibleButtonCount > 0
  const ACTION_BUTTONS_WIDTH = `${visibleButtonCount * 2.5}rem`

  return (
    <div>
      <div className='task-input' style={{ minHeight: '2.8em' }}>
        <textarea
          ref={titleInputRef}
          autoFocus={autoFocus}
          rows={1}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleTextareaKeyDown}
          onClick={handleTextareaClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `calc(100% - ${ACTION_BUTTONS_WIDTH})`,
            height: '100%',
            zIndex: 1,
            resize: 'none',
            overflow: 'hidden',
            padding: '0.6rem 0.75rem',
            boxSizing: 'border-box',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            backgroundColor: 'transparent',
            color: 'transparent',
            caretColor: mode === 'dark' ? '#fff' : '#000',
            border: 'none',
            outline: 'none',
          }}
        />
        <div
          className='smart-task-display smart-task-common'
          ref={dropdownRef}
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: '1.2em',
            padding: '0.6rem 0.75rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
          }}
          onClick={handleDisplayClick}
        >
          {placeholder && !value && (
            <span
              style={{
                pointerEvents: 'none',
                color: 'var(--joy-palette-text-tertiary, #9fa6ad)',
              }}
            >
              {placeholder}
            </span>
          )}
          {customRenderer
            ? customRenderer
            : renderHighlightedText(value, cursorPosition)}
          {/* Zero-width space to maintain consistent height */}
          &#8203;
        </div>
        {showActionButtons && (
          <span
            style={{
              position: 'absolute',
              top: '50%',
              right: '0.3rem',
              transform: 'translateY(-50%)',
              zIndex: 2,
              display: 'flex',
              gap: '0.1rem',
            }}
          >
            {showPhotoButtons && onPhotoSelected && (
              <>
                <Tooltip title='Select photo' placement='top' size='sm'>
                  <IconButton
                    size='sm'
                    variant='plain'
                    color='neutral'
                    onClick={() => photoInputRef.current?.click()}
                    sx={{ borderRadius: 'xl' }}
                  >
                    <PhotoFilter fontSize='small' />
                  </IconButton>
                </Tooltip>
                <input
                  ref={photoInputRef}
                  type='file'
                  accept='image/*'
                  style={{ display: 'none' }}
                  onChange={handlePhotoInputChange}
                />
              </>
            )}
            {showPhotoButtons && onScanClick && (
              <Tooltip title='Scan to create task' placement='top' size='sm'>
                <IconButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={onScanClick}
                  sx={{ borderRadius: 'xl' }}
                >
                  <CameraEnhance fontSize='small' />
                </IconButton>
              </Tooltip>
            )}
            {showVoiceButton && (
              <Tooltip title='Speak to create tasks' placement='top' size='sm'>
                <IconButton
                  size='sm'
                  variant='plain'
                  color='neutral'
                  onClick={onVoiceClick}
                  sx={{ borderRadius: 'xl' }}
                >
                  <Mic fontSize='small' />
                </IconButton>
              </Tooltip>
            )}
          </span>
        )}
      </div>
      {showSuggestions && (
        <AutocompleteDropdown
          currentValue={lastWord}
          suggestions={suggestions[suggestionTrigger]}
          selectedIndex={selectedSuggestionIndex}
          onMouseEnterSuggestion={index => {
            setSelectedSuggestionIndex(index)
          }}
          onSelectSuggestion={suggestion => {
            const suggestionValue = suggestions[suggestionTrigger].display
              ? suggestion[suggestions[suggestionTrigger].display]
              : suggestion
            const newValue = `${value.slice(0, cursorPosition)}${suggestionValue}${value.slice(cursorPosition)}`

            onChange(newValue)
            titleInputRef?.current?.focus()

            setCursorPosition(cursorPosition + suggestion.length)
            titleInputRef.current.value = newValue
            titleInputRef.current.setSelectionRange(
              cursorPosition + suggestionValue.length,
              cursorPosition + suggestionValue.length,
            )
            setShowSuggestions(false)
          }}
          onCreateSuggestion={name => {
            selectSuggestionText(name)
            suggestions[suggestionTrigger].onCreate?.(name)
          }}
          parentRefer={dropdownRef}
        />
      )}
    </div>
  )
}

export default SmartTaskTitleInput
