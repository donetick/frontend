import { Chip, Menu, MenuItem } from '@mui/joy'
import IconButton from '@mui/joy/IconButton'
import React, { useEffect, useRef, useState } from 'react'
import { getTextColorFromBackgroundColor } from '../../utils/LabelColors'

const IconButtonWithMenu = ({
  key,
  icon,
  options,
  onItemSelect,
  selectedItem,
  setSelectedItem,
  isActive,
  useChips,
}) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const menuRef = useRef(null)

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }
  useEffect(() => {
    document.addEventListener('mousedown', handleMenuOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleMenuOutsideClick)
    }
  }, [anchorEl])

  const handleMenuOutsideClick = event => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      handleMenuClose()
    }
  }

  return (
    <>
      <IconButton
        onClick={handleMenuOpen}
        variant='outlined'
        color={isActive ? 'primary' : 'neutral'}
        size='sm'
        sx={{
          height: 24,
          borderRadius: 24,
        }}
      >
        {icon}
      </IconButton>

      <Menu
        key={key}
        ref={menuRef}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {options?.map(item => (
          <MenuItem
            key={`${key}-${item?.id}`}
            onClick={() => {
              onItemSelect(item)
              setSelectedItem?.selectedItem(item.name)
              handleMenuClose()
            }}
          >
            {useChips ? (
              <Chip
                sx={{
                  backgroundColor: item.color ? item.color : null,
                  color: getTextColorFromBackgroundColor(item.color),
                }}
              >
                {item.name}
              </Chip>
            ) : (
              <>
                {item?.icon}
                {item.name}
              </>
            )}
          </MenuItem>
        ))}
        {/* {selectedItem && selectedItem !== 'All' && (
            <MenuItem
              id={`${id}cancel-all-filters`}
              onClick={() => {
                onItemSelect(null)
                setSelectedItem?.setSelectedItem('All')
              }}
            >
              Cancel All Filters
            </MenuItem>
          )} */}
      </Menu>
    </>
  )
}
export default IconButtonWithMenu
