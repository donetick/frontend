import { Email, OpenInNew, Phone } from '@mui/icons-material'
import { Chip } from '@mui/joy'
import { LINK_TYPES, openExternalLink } from '../../utils/ExternalLinks'

const ICONS = {
  [LINK_TYPES.email]: Email,
  [LINK_TYPES.phone]: Phone,
  [LINK_TYPES.url]: OpenInNew,
}

/** Icon matching a link type, for callers that render their own control. */
export const LinkTypeIcon = ({ type, ...props }) => {
  const Icon = ICONS[type] || OpenInNew
  return <Icon {...props} />
}

/**
 * Renders a detected link (web page, email address or phone number) as a
 * tappable chip. Opening is delegated to the OS so tel:/mailto: hand off to
 * the dialer and mail client on native.
 */
const ExternalLinkChip = ({
  link,
  iconSize = 14,
  size = 'sm',
  sx,
  variant = 'soft',
  ...chipProps
}) => {
  if (!link?.href) return null

  const Icon = ICONS[link.type] || OpenInNew

  return (
    <Chip
      variant={variant}
      color='primary'
      size={size}
      startDecorator={<Icon sx={{ fontSize: iconSize }} />}
      onClick={event => {
        event.stopPropagation()
        openExternalLink(link)
      }}
      title={link.label}
      sx={{
        cursor: 'pointer',
        maxWidth: 180,
        '& .MuiChip-label': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        ...sx,
      }}
      {...chipProps}
    >
      {link.label}
    </Chip>
  )
}

export default ExternalLinkChip
