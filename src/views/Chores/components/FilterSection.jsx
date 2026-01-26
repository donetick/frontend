import { Box } from '@mui/joy'
import CustomFilterChips from './CustomFilterChips'

const FilterSection = ({
  savedFilters,
  activeFilterId,

  onFilterClick,
  onFilterDelete,
  onFilterPin,
  onFilterEdit,
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

      {/* Active Custom Filter Display */}
    </>
  )
}

export default FilterSection
