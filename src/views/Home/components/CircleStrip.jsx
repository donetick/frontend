import { Avatar, Box, Sheet, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { resolvePhotoURL } from '../../../utils/Helpers'

// Geometry for the ring. Kept as constants because the radius, the stroke and
// the avatar size are one decision: the avatar has to clear the stroke, and the
// circumference below is what every arc length is measured against.
const RING_SIZE = 46
const RING_STROKE = 3.5
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const AVATAR_SIZE = 34

// Breathing room between the done arc and the overdue arc so two segments read
// as two, not as one bicoloured stroke.
const ARC_GAP = 3

// A single task in a one-task week would otherwise draw a full circle, which
// reads as a finished week rather than a thin start.
const MIN_DENOMINATOR = 4

/**
 * An arc as SVG dash geometry: `length` along the circumference starting at
 * `offset` from twelve o'clock. Dasharray draws one visible run and then hides
 * the rest of the circle; the negative dashoffset rotates that run into place.
 */
const arc = (length, offset) => ({
  strokeDasharray: `${Math.max(length, 0)} ${RING_CIRCUMFERENCE}`,
  strokeDashoffset: -offset,
})

/**
 * Who else is carrying what, as a week rather than a number. Each person is
 * their avatar inside a closing ring: the filled part is what they finished in
 * the last seven days, the red tail is what has gone late, and the empty track
 * is the rest of what is still open.
 *
 * It is a ring and not a bar because a ring belongs to the face it surrounds —
 * it reads as one person's own week closing, not as a position in a league
 * table. Nothing here is comparative: the strip is sorted by name, and no
 * percentage is ever written down.
 */
const CircleStrip = ({ members }) => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  /**
   * The line under the name says the one thing worth acting on, in the order
   * you would act on it. Lateness first, then a plain open count, then the
   * week's work — a person with nothing open has still had a week.
   */
  const summarize = member => {
    if (member.late > 0) return t('home.circle.late', { count: member.late })
    if (member.open > 0) return t('home.circle.open', { count: member.open })
    if (member.done > 0) return t('home.circle.done', { count: member.done })
    return t('home.circle.caughtUp')
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {members.map(member => {
        // Their week: everything they closed plus everything still on them.
        // Anchoring the ring to a floor keeps a light week from looking like a
        // triumphant one, and keeps a single overdue task from filling the ring
        // with red.
        const week = Math.max(member.done + member.open, MIN_DENOMINATOR)
        const doneArc = (member.done / week) * RING_CIRCUMFERENCE
        const lateArc = (member.late / week) * RING_CIRCUMFERENCE
        // The gap is taken out of the second arc, so the done arc keeps the
        // exact length its share earned.
        const lateOffset = doneArc + (doneArc > 0 ? ARC_GAP : 0)

        return (
          <Sheet
            key={member.userId}
            component='button'
            type='button'
            variant='plain'
            color='neutral'
            onClick={() => navigate(`/members/${member.userId}`)}
            // The ring is decoration to a screen reader; the sentence it stands
            // for is what gets read out.
            aria-label={`${member.displayName}, ${summarize(member)}`}
            sx={{
              alignItems: 'center',
              bgcolor: 'transparent',
              // Sheet renders a real <button> here, so the user-agent border
              // has to be cleared or it draws a box around the column.
              border: 'none',
              borderRadius: 'lg',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              font: 'inherit',
              gap: 0.75,
              px: 0.5,
              py: 0.75,
              transition:
                'background-color 160ms cubic-bezier(0.22, 1, 0.36, 1)',
              width: 76,
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.solidBg',
                outlineOffset: 2,
              },
            }}
          >
            <Box
              sx={{
                display: 'grid',
                height: RING_SIZE,
                placeItems: 'center',
                width: RING_SIZE,
              }}
            >
              <Box
                aria-hidden='true'
                component='svg'
                viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                sx={{
                  gridArea: '1 / 1',
                  height: RING_SIZE,
                  // Twelve o'clock is where a ring is read from, but SVG
                  // measures from three.
                  transform: 'rotate(-90deg)',
                  width: RING_SIZE,
                }}
              >
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill='none'
                  stroke='var(--joy-palette-neutral-outlinedBorder)'
                  strokeWidth={RING_STROKE}
                />
                {member.done > 0 && (
                  <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill='none'
                    stroke='var(--joy-palette-success-solidBg)'
                    strokeLinecap='round'
                    strokeWidth={RING_STROKE}
                    style={arc(doneArc, 0)}
                  />
                )}
                {member.late > 0 && (
                  <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill='none'
                    stroke='var(--joy-palette-danger-solidBg)'
                    strokeLinecap='round'
                    strokeWidth={RING_STROKE}
                    style={arc(lateArc, lateOffset)}
                  />
                )}
              </Box>
              <Avatar
                size='sm'
                src={resolvePhotoURL(member.image)}
                alt=''
                sx={{
                  bgcolor: 'background.level2',
                  color: 'text.secondary',
                  fontSize: 13,
                  gridArea: '1 / 1',
                  height: AVATAR_SIZE,
                  width: AVATAR_SIZE,
                }}
              >
                {member.displayName.charAt(0).toUpperCase()}
              </Avatar>
            </Box>
            {/* Explicit, because a plain Sheet passes neutral.plainColor down
                and would leave the name dimmer than the line under it. */}
            <Typography
              level='body-xs'
              fontWeight={600}
              noWrap
              textColor='text.primary'
              sx={{ fontSize: 12, maxWidth: '100%' }}
            >
              {member.displayName}
            </Typography>
            <Typography
              aria-hidden='true'
              level='body-xs'
              noWrap
              textColor={
                member.late > 0 ? 'danger.plainColor' : 'text.tertiary'
              }
              sx={{
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums',
                maxWidth: '100%',
                mt: -0.5,
              }}
            >
              {summarize(member)}
            </Typography>
          </Sheet>
        )
      })}
    </Box>
  )
}

CircleStrip.propTypes = {
  members: PropTypes.array.isRequired,
}

export default CircleStrip
