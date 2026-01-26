import { Add, CancelRounded } from '@mui/icons-material'
import { Box, Button, Chip, IconButton } from '@mui/joy'
import CustomFilterChips from './CustomFilterChips'

const FilterSection = ({
  savedFilters,
  activeFilterId,
  activeFilter,
  hasProjectConditions,
  onFilterClick,
  onFilterDelete,
  onFilterPin,
  onFilterEdit,
  onClearActiveFilter,
  onCreateAdvancedFilter,
  updateFilterUrl,
}) => {
  return (
    <>
      {/* Custom Filter Chips */}
      {savedFilters.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <CustomFilterChips
            filters={savedFilters}
            activeFilterId={activeFilterId}
            onFilterClick={onFilterClick}
            onFilterDelete={onFilterDelete}
            onFilterPin={onFilterPin}
            onFilterEdit={onFilterEdit}
          />
        </Box>
      )}

      {/* Create Advanced Filter Button */}
      {!activeFilterId && (
        <Box
          sx={{
            mt: 1,
            display: 'flex',
            gap: 1,
            justifyContent: 'flex-start',
          }}
        >
          <Button
            size='sm'
            variant='outlined'
            color='primary'
            startDecorator={<Add />}
            onClick={onCreateAdvancedFilter}
          >
            Create Advanced Filter
          </Button>
        </Box>
      )}

      {/* Active Custom Filter Display */}
      {activeFilter && (
        <Box sx={{ mt: 1 }}>
          <Chip
            color='primary'
            variant='soft'
            size='lg'
            endDecorator={
              <IconButton size='sm' onClick={onClearActiveFilter}>
                <CancelRounded />
              </IconButton>
            }
          >
            Filter: {activeFilter.name} ({activeFilter.count} tasks
            {activeFilter.overdueCount > 0 &&
              `, ${activeFilter.overdueCount} overdue`}
            )
            {hasProjectConditions && (
              <Chip size='sm' sx={{ ml: 1 }} variant='solid' color='primary'>
                Cross-Project
              </Chip>
            )}
          </Chip>
        </Box>
      )}
    </>
  )
}

export default FilterSection
