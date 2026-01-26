/**
 * Custom Filter Storage - Manages saving/loading custom filters
 *
 * This module handles CRUD operations for custom filters.
 * Currently uses localStorage, but designed to easily migrate to backend API.
 */

const STORAGE_KEY = 'customFilters'
const MAX_FILTERS = 20 // Limit to prevent localStorage overflow

/**
 * Generate a unique filter ID
 */
const generateFilterId = () => {
  return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get all saved filters
 * @returns {Array} - Array of filter objects
 */
export const getSavedFilters = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const filters = JSON.parse(stored)

    // Ensure filters have required fields
    return filters.filter(f => f.id && f.name && f.conditions)
  } catch (error) {
    console.error('Error loading saved filters:', error)
    return []
  }
}

/**
 * Save a new filter
 * @param {Object} filter - The filter to save
 * @returns {Object} - The saved filter with generated ID and metadata
 */
export const saveFilter = (filter) => {
  try {
    const filters = getSavedFilters()

    // Check limit
    if (filters.length >= MAX_FILTERS) {
      throw new Error(`Maximum of ${MAX_FILTERS} filters allowed. Please delete some filters first.`)
    }

    // Create new filter with metadata
    const newFilter = {
      id: generateFilterId(),
      name: filter.name,
      icon: filter.icon || null,
      conditions: filter.conditions,
      operator: filter.operator || 'AND',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: filter.isPinned || false,
      usageCount: 0,
      lastUsedAt: null
    }

    // Add to filters array
    const updatedFilters = [...filters, newFilter]

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFilters))

    return newFilter
  } catch (error) {
    console.error('Error saving filter:', error)
    throw error
  }
}

/**
 * Update an existing filter
 * @param {string} filterId - The ID of the filter to update
 * @param {Object} updates - The fields to update
 * @returns {Object} - The updated filter
 */
export const updateFilter = (filterId, updates) => {
  try {
    const filters = getSavedFilters()
    const filterIndex = filters.findIndex(f => f.id === filterId)

    if (filterIndex === -1) {
      throw new Error('Filter not found')
    }

    // Update filter
    const updatedFilter = {
      ...filters[filterIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    filters[filterIndex] = updatedFilter

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))

    return updatedFilter
  } catch (error) {
    console.error('Error updating filter:', error)
    throw error
  }
}

/**
 * Delete a filter
 * @param {string} filterId - The ID of the filter to delete
 * @returns {boolean} - Success status
 */
export const deleteFilter = (filterId) => {
  try {
    const filters = getSavedFilters()
    const updatedFilters = filters.filter(f => f.id !== filterId)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFilters))

    return true
  } catch (error) {
    console.error('Error deleting filter:', error)
    throw error
  }
}

/**
 * Get a single filter by ID
 * @param {string} filterId - The ID of the filter
 * @returns {Object|null} - The filter object or null if not found
 */
export const getFilterById = (filterId) => {
  const filters = getSavedFilters()
  return filters.find(f => f.id === filterId) || null
}

/**
 * Increment usage count for a filter
 * @param {string} filterId - The ID of the filter
 */
export const trackFilterUsage = (filterId) => {
  try {
    const filters = getSavedFilters()
    const filterIndex = filters.findIndex(f => f.id === filterId)

    if (filterIndex !== -1) {
      filters[filterIndex].usageCount = (filters[filterIndex].usageCount || 0) + 1
      filters[filterIndex].lastUsedAt = new Date().toISOString()

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    }
  } catch (error) {
    console.error('Error tracking filter usage:', error)
  }
}

/**
 * Toggle pin status of a filter
 * @param {string} filterId - The ID of the filter
 * @returns {boolean} - New pin status
 */
export const toggleFilterPin = (filterId) => {
  try {
    const filters = getSavedFilters()
    const filterIndex = filters.findIndex(f => f.id === filterId)

    if (filterIndex === -1) {
      throw new Error('Filter not found')
    }

    filters[filterIndex].isPinned = !filters[filterIndex].isPinned
    filters[filterIndex].updatedAt = new Date().toISOString()

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))

    return filters[filterIndex].isPinned
  } catch (error) {
    console.error('Error toggling filter pin:', error)
    throw error
  }
}

/**
 * Get filters sorted by usage (most used first)
 * @returns {Array} - Sorted filters
 */
export const getFiltersByUsage = () => {
  const filters = getSavedFilters()
  return filters.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
}

/**
 * Get pinned filters
 * @returns {Array} - Pinned filters
 */
export const getPinnedFilters = () => {
  const filters = getSavedFilters()
  return filters.filter(f => f.isPinned)
}

/**
 * Check if filter name already exists
 * @param {string} name - The filter name to check
 * @param {string} excludeId - Optional ID to exclude from check (for updates)
 * @returns {boolean} - Whether the name exists
 */
export const filterNameExists = (name, excludeId = null) => {
  const filters = getSavedFilters()
  return filters.some(f =>
    f.name.toLowerCase() === name.toLowerCase() &&
    f.id !== excludeId
  )
}

/**
 * Export filters as JSON (for backup/sharing)
 * @returns {string} - JSON string of all filters
 */
export const exportFilters = () => {
  const filters = getSavedFilters()
  return JSON.stringify(filters, null, 2)
}

/**
 * Import filters from JSON
 * @param {string} jsonString - JSON string of filters
 * @returns {number} - Number of filters imported
 */
export const importFilters = (jsonString) => {
  try {
    const importedFilters = JSON.parse(jsonString)

    if (!Array.isArray(importedFilters)) {
      throw new Error('Invalid filter format')
    }

    const existingFilters = getSavedFilters()

    // Generate new IDs for imported filters to avoid conflicts
    const newFilters = importedFilters.map(filter => ({
      ...filter,
      id: generateFilterId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      lastUsedAt: null
    }))

    const allFilters = [...existingFilters, ...newFilters]

    // Check limit
    if (allFilters.length > MAX_FILTERS) {
      throw new Error(`Import would exceed maximum of ${MAX_FILTERS} filters`)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(allFilters))

    return newFilters.length
  } catch (error) {
    console.error('Error importing filters:', error)
    throw error
  }
}

/**
 * Clear all filters (use with caution!)
 * @returns {boolean} - Success status
 */
export const clearAllFilters = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Error clearing filters:', error)
    throw error
  }
}
