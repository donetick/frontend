// AutocompleteDropdown.jsx
import { Add } from '@mui/icons-material'
import { Divider, Menu, MenuItem } from '@mui/joy'
import React, { useEffect } from 'react'

const AutocompleteDropdown = ({
  currentValue,
  onCreateSuggestion,
  onMouseEnterSuggestion,
  onSelectSuggestion,
  parentRefer, // Added for hover selection
  selectedIndex, // Called when the "Create new" row is chosen
  suggestions, // Ref to the dropdown element
}) => {
  // Scroll selected item into view
  const dropdownMenuRef = React.useRef(null)
  useEffect(() => {
    const selectedElement = dropdownMenuRef.current?.querySelector('.selected')
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      })
    }
  }, [selectedIndex, dropdownMenuRef])

  if (!suggestions || suggestions.options === 0) {
    return null // Don't render if no suggestions
  }

  const filteredOptions = suggestions.options.filter(option => {
    if (typeof option === 'string') {
      return option.toLowerCase().includes(currentValue.toLowerCase())
    }
    return option[suggestions.display]
      .toLowerCase()
      .includes(currentValue.toLowerCase())
  })

  const trimmedValue = currentValue.trim()
  const hasExactMatch = filteredOptions.some(option => {
    const optionText = suggestions.display
      ? option[suggestions.display]
      : option
    return optionText.toLowerCase() === trimmedValue.toLowerCase()
  })
  const showCreateOption =
    suggestions.creatable && trimmedValue.length > 0 && !hasExactMatch

  return (
    <Menu
      open={Boolean(suggestions?.options?.length) || showCreateOption}
      ref={dropdownMenuRef}
      anchorEl={parentRefer.current}
      onClose={() => {}}
      sx={{
        width: '300px',
        maxHeight: '160px',
        overflow: 'auto',
        position: 'relative',
        bottom: 0,
        left: 0,
        zIndex: 1300,
      }}
    >
      {filteredOptions.map((option, index) => (
        <MenuItem
          key={suggestions.display ? option[suggestions.value] : option}
          selected={selectedIndex === index}
          onClick={() => onSelectSuggestion(option)}
          onMouseEnter={() => onMouseEnterSuggestion(index)} // Update selected index on hover
          className={selectedIndex === index ? 'selected' : ''} // Add class for selected item
          sx={{
            cursor: 'pointer',
            backgroundColor: selectedIndex === index ? 'gray.800' : 'inherit',
          }}
        >
          {suggestions.display ? option[suggestions.display] : option}
        </MenuItem>
      ))}
      {showCreateOption && (
        <>
          {filteredOptions.length > 0 && <Divider orientation='horizontal' />}
          <MenuItem
            selected={selectedIndex === filteredOptions.length}
            onClick={() => onCreateSuggestion(trimmedValue)}
            onMouseEnter={() => onMouseEnterSuggestion(filteredOptions.length)}
            className={
              selectedIndex === filteredOptions.length ? 'selected' : ''
            }
            sx={{
              cursor: 'pointer',
              backgroundColor:
                selectedIndex === filteredOptions.length
                  ? 'gray.800'
                  : 'inherit',
              gap: 0.5,
            }}
          >
            <Add fontSize='small' />
            Create &quot;{trimmedValue}&quot;
          </MenuItem>
        </>
      )}
    </Menu>
  )
}

export default AutocompleteDropdown
