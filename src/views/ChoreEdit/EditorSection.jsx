import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { Box, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'

export default function EditorSection({
  title,
  icon: Icon,
  summary,
  children,
  section,
  collapsible = false,
  defaultOpen = false,
  hideHeading = false,
  error,
  sx,
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => {
    if (defaultOpen || error) setOpen(true)
  }, [defaultOpen, error])
  const expanded = !collapsible || open
  return (
    <Box
      data-editor-section={section}
      sx={{
        minWidth: 0,
        borderBottom: '1px solid',
        borderColor: error ? 'danger.outlinedBorder' : 'divider',
        ...sx,
      }}
    >
      {!hideHeading && (
        <Box
          component={collapsible ? 'button' : 'div'}
          type={collapsible ? 'button' : undefined}
          aria-expanded={collapsible ? expanded : undefined}
          aria-controls={collapsible ? `editor-${section}` : undefined}
          onClick={collapsible ? () => setOpen(value => !value) : undefined}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            textAlign: 'left',
            width: '100%',
            flex: 1,
            minWidth: 0,
            px: { xs: 2, sm: 3 },
            py: 2,
            minHeight: 64,
            border: 0,
            background: 'transparent',
            color: 'text.primary',
            cursor: collapsible ? 'pointer' : 'default',
            '&:hover': collapsible ? { bgcolor: 'background.level1' } : {},
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.500',
              outlineOffset: -2,
            },
          }}
        >
          {Icon && (
            <Icon
              sx={{
                fontSize: 20,
                color: error ? 'danger.500' : 'text.tertiary',
                flexShrink: 0,
              }}
            />
          )}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: { xs: 0.25, sm: 2 },
            }}
          >
            <Typography level='title-sm' sx={{ flexShrink: 0 }}>
              {title}
            </Typography>
            {summary && (
              <Typography
                level='body-sm'
                textColor='text.tertiary'
                sx={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                  ml: { sm: 'auto' },
                }}
              >
                {summary}
              </Typography>
            )}
          </Box>
          {collapsible &&
            (expanded ? (
              <ExpandLess sx={{ fontSize: 20, color: 'text.tertiary' }} />
            ) : (
              <ExpandMore sx={{ fontSize: 20, color: 'text.tertiary' }} />
            ))}
        </Box>
      )}
      {expanded && children && (
        <Box
          id={`editor-${section}`}
          sx={{
            px: { xs: 2, sm: 3 },
            pb: 2.5,
            pt: hideHeading ? 2.5 : 1,
            minWidth: 0,
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  )
}
