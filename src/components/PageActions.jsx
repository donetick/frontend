import { MoreVert } from '@mui/icons-material'
import { Badge, IconButton } from '@mui/joy'
import { forwardRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { useNavBarTitleContext } from '../contexts/NavBarTitleContext'
import { usePageActionsRegion } from '../contexts/PageActionsRegionContext'
import ActionMenu from './common/ActionMenu'

/**
 * The page-actions trigger: an overflow affordance, the same on every
 * breakpoint. The icon already reads as "more", so it carries its name in
 * aria-label rather than in visible text competing with the page title.
 *
 * `count` surfaces how many actions are currently doing something (active
 * filters, say) so the closed menu is not a black box.
 */
export const PageActionsButton = forwardRef(function PageActionsButton(
  { count = 0, ...props },
  ref,
) {
  const { t } = useTranslation('common')

  const button = (
    <IconButton
      ref={ref}
      variant='plain'
      color='neutral'
      aria-label={t('actions')}
      {...props}
    >
      <MoreVert />
    </IconButton>
  )

  if (!count) return button
  return (
    <Badge
      badgeContent={count}
      color='primary'
      size='sm'
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ display: 'inline-flex' }}
    >
      {button}
    </Badge>
  )
})

/**
 * Puts arbitrary content in the page-actions slot — the mobile nav bar, or the
 * desktop page header of the region this page is in. Use it when the page's
 * actions already have a component of their own, such as a task's
 * ChoreActionMenu on the task detail page; reach for PageActions when all the
 * page has is a list of actions.
 *
 * Renders nothing until a slot exists, so pages without a header (sign-in,
 * onboarding) silently drop their actions rather than crashing.
 */
export function PageActionsSlot({ children }) {
  const { getPageActionsTarget } = useNavBarTitleContext()
  const region = usePageActionsRegion()
  const target = getPageActionsTarget(region)
  if (!target) return null
  return createPortal(children, target)
}

/**
 * A page's overflow menu. Pass the same declarative item list ActionMenu takes
 * — including `panel` items for drill-downs — and it lands in the header slot
 * for the current viewport, presented as a menu on desktop and a sheet on a
 * phone.
 *
 * Actions stay defined by the page that owns them, however deep in the tree
 * that is, so their callbacks and modal state stay local.
 */
export default function PageActions({
  actions,
  count = 0,
  panels,
  title,
  ...menuProps
}) {
  const { t } = useTranslation('common')

  return (
    <PageActionsSlot>
      <ActionMenu
        aria-label={t('actions')}
        items={actions}
        panels={panels}
        title={title || t('actions')}
        trigger={<PageActionsButton count={count} />}
        {...menuProps}
      />
    </PageActionsSlot>
  )
}
