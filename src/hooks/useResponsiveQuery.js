import useMediaQuery from '@mui/material/useMediaQuery'

import { viewportQueries } from '../constants/responsive'

/**
 * Shared viewport detection. Prefer a named query from constants/responsive;
 * a raw query is supported for configurable component boundaries.
 * MUI handles subscriptions, theme breakpoints, cleanup and SSR fallback.
 */
export const useResponsiveQuery = query =>
  useMediaQuery(viewportQueries[query] ?? query)
