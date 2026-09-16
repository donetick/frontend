import { Box, Sheet, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { getIconComponent } from '../../../utils/ProjectIcons'
import { DEFAULT_PROJECT_ID } from '../useHomeSummary'

// Two rows of two. A fifth project would push the section past the height of
// the list above it, and the header already links to the full set.
const GRID_LIMIT = 4

/**
 * Where the work is piling up. A project earns a mention of lateness because a
 * late project is a scheduling problem you can act on, unlike a late person.
 *
 * Laid out two per row with the icon beside the text rather than above it, and
 * with the whole state of the project said in one line rather than drawn: a
 * comparison bar on a four-item grid was decoration, and the sentence under
 * the name is both smaller and more exact.
 */
const ProjectStrip = ({ projects }) => {
  // The default project is unnamed everywhere it is synthesized, so its label
  // comes from the same string the task list and the project picker use.
  const { t } = useTranslation(['common', 'chores'])
  const navigate = useNavigate()

  /**
   * One line, in order of what you would act on first: lateness, then work
   * with no date on it at all, then the plain count. Only the leading problem
   * is named — a project that is both late and unplanned is a late project.
   */
  const summarize = project => {
    if (project.open === 0) return t('home.projects.clear')
    if (project.late > 0) {
      return t('home.projects.tasksOverdue', {
        count: project.open,
        overdue: project.late,
      })
    }
    if (project.unplanned > 0) {
      return t('home.projects.tasksUnplanned', {
        count: project.open,
        unplanned: project.unplanned,
      })
    }
    return t('home.projects.tasks', { count: project.open })
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: '1fr 1fr',
      }}
    >
      {projects.slice(0, GRID_LIMIT).map(project => {
        const Icon = getIconComponent(project.icon)
        return (
          <Sheet
            key={project.id}
            component='button'
            type='button'
            variant='soft'
            color='neutral'
            onClick={() => navigate(`/chores?project=${project.id}`)}
            sx={{
              alignItems: 'center',
              // Sheet renders a real <button> here, so the user-agent border
              // has to be cleared or it draws over the soft surface.
              border: 'none',
              borderRadius: 'lg',
              columnGap: 1.25,
              cursor: 'pointer',
              display: 'grid',
              font: 'inherit',
              gridTemplateColumns: '28px minmax(0, 1fr)',
              px: 1.25,
              py: 1,
              textAlign: 'start',
              transition:
                'background-color 160ms cubic-bezier(0.22, 1, 0.36, 1)',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.solidBg',
                outlineOffset: 2,
              },
            }}
          >
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: 'background.surface',
                borderRadius: 'sm',
                display: 'flex',
                gridRow: 'span 2',
                height: 28,
                justifyContent: 'center',
                width: 28,
              }}
            >
              <Icon sx={{ color: 'primary.plainColor', fontSize: 16 }} />
            </Box>
            {/* Explicit, because a soft Sheet passes neutral.softColor down and
                would leave the name dimmer than the count under it. */}
            <Typography
              level='body-xs'
              fontWeight={600}
              noWrap
              textColor='text.primary'
              sx={{ fontSize: 13, width: '100%' }}
            >
              {project.id === DEFAULT_PROJECT_ID && !project.name
                ? t('chores:toolbar.defaultProject')
                : project.name}
            </Typography>
            {/* noWrap, because a second line here would make this cell taller
                than the one beside it and the whole grid row with it. */}
            <Typography
              level='body-xs'
              noWrap
              textColor={
                project.open === 0 ? 'text.tertiary' : 'text.secondary'
              }
              sx={{ fontVariantNumeric: 'tabular-nums', width: '100%' }}
            >
              {summarize(project)}
            </Typography>
          </Sheet>
        )
      })}
    </Box>
  )
}

ProjectStrip.propTypes = {
  projects: PropTypes.array.isRequired,
}

export default ProjectStrip
