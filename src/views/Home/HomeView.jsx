import { AddTask, GroupAdd, Tune } from '@mui/icons-material'
import { Box, Button, Container, IconButton, Sheet, Typography } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext'
import { useChores } from '../../queries/ChoreQueries'
import { useNotification } from '../../service/NotificationProvider'
import { ChoreSorter } from '../../utils/Chores'
import { getHomeSectionsConfig } from '../../utils/HomeSectionsConfig'
import { getSafeBottomPadding } from '../../utils/SafeAreaUtils'
import ChoreModals from '../Chores/components/ChoreModals'
import { useChoreActions } from '../Chores/hooks/useChoreActions'
import { useChoreModals } from '../Chores/hooks/useChoreModals'
import TaskInput from '../components/AddTaskModal'
import LoadingComponent from '../components/Loading'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import CaptureBar from './components/CaptureBar'
import CircleStrip from './components/CircleStrip'
import FilterStrip from './components/FilterStrip'
import HomeChoreList from './components/HomeChoreList'
import ProjectStrip from './components/ProjectStrip'
import TriageRow from './components/TriageRow'
import useHomeSummary from './useHomeSummary'

// Home has no multi-select, so the bulk half of useChoreActions is inert.
const NO_SELECTION = () => []
const NOOP = () => {}

// Same reasoning as Next up: a queue, not a list. The section header links to
// the full pending-approval filter once there are more.
const REVIEW_LIMIT = 3

// Enough room under the last section that the fixed capture bar never covers
// a tappable card.
const CAPTURE_CLEARANCE = 11

const SectionHeader = ({ action, actionTo, title }) => (
  <Box
    sx={{
      alignItems: 'baseline',
      display: 'flex',
      gap: 2,
      justifyContent: 'space-between',
      mb: 1.25,
      mt: 2.25,
    }}
  >
    <Typography level='title-sm' sx={{ letterSpacing: '0.01em' }}>
      {title}
    </Typography>
    {action && (
      <Typography
        component={Link}
        to={actionTo}
        level='body-xs'
        sx={{
          color: 'primary.plainColor',
          fontWeight: 550,
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        {action}
      </Typography>
    )}
  </Box>
)

SectionHeader.propTypes = {
  action: PropTypes.string,
  actionTo: PropTypes.string,
  title: PropTypes.string.isRequired,
}

/**
 * The app's front door. It answers one question — what needs me, and what
 * should I do next — and everything below the fold is context that has to earn
 * its place: a section with nothing to say does not render at all.
 *
 * The full task list still lives at /chores; this screen is deliberately not a
 * second copy of it.
 */
const HomeView = () => {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { showError, showSuccess, showUndo, showWarning } = useNotification()
  const { impersonatedUser } = useImpersonateUser()

  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureMode, setCaptureMode] = useState(null)
  const [confirmModelConfig, setConfirmModelConfig] = useState({})

  const {
    data: choresData,
    isLoading: choresLoading,
    refetch: refetchChores,
  } = useChores()

  // Home holds the same optimistic list the task list holds, so an action
  // taken here disappears from the row immediately instead of waiting on a
  // refetch. The query stays the source of truth and re-syncs below.
  const [chores, setChores] = useState([])
  useEffect(() => {
    if (!choresData?.res) return
    setChores([...choresData.res].sort(ChoreSorter))
  }, [choresData?.res])

  const {
    circle,
    dueToday,
    filterPulse,
    hasAnyTask,
    isLoading,
    membersData,
    needsReview,
    nextUp,
    nextUpFallback,
    overdue,
    overduePreview,
    projectPulse,
    userProfile,
    verdict,
  } = useHomeSummary(chores)

  // Reread on every mount and whenever the settings page saves a change, so
  // Home reflects a reorder/hide without needing a full app reload.
  const [sectionsConfig, setSectionsConfig] = useState(getHomeSectionsConfig)
  useEffect(() => {
    const onConfigChanged = () => setSectionsConfig(getHomeSectionsConfig())
    window.addEventListener('homeSectionsConfigChanged', onConfigChanged)
    return () =>
      window.removeEventListener('homeSectionsConfigChanged', onConfigChanged)
  }, [])
  const sectionOrder = [...sectionsConfig]
    .sort((a, b) => a.order - b.order)
    .filter(section => section.enabled)
    .map(section => section.id)

  const { activeModal, closeModal, modalChore, openModal } = useChoreModals()

  // Every task action on Home runs through the task list's own pipeline, so
  // complete, approve, skip, reschedule, nudge and delete behave identically
  // on both screens — including their undo and their offline queueing.
  const {
    handleAssigneeChange,
    handleChangeDueDate,
    handleChoreAction,
    handleCompleteWithNote,
    handleCompleteWithPastDate,
    handleNudge,
  } = useChoreActions({
    chores,
    clearSelection: NOOP,
    closeModal,
    getSelectedChoresData: NO_SELECTION,
    impersonatedUser,
    modalChore,
    openModal,
    refetchChores,
    setChores,
    setConfirmModelConfig,
    showError,
    showSuccess,
    showUndo,
    showWarning,
    userProfile,
  })

  const openCapture = mode => {
    setCaptureMode(mode)
    setCaptureOpen(true)
  }

  if (isLoading || choresLoading || !userProfile) return <LoadingComponent />

  const performers = membersData?.res || []
  const currentMember = performers.find(
    member => member.userId === (impersonatedUser?.userId || userProfile?.id),
  )
  const canReviewTasks =
    currentMember?.role === 'admin' || currentMember?.role === 'manager'
  const showClearState =
    nextUp.length === 0 &&
    nextUpFallback.length === 0 &&
    overduePreview.length === 0

  // Keyed by the same ids the customization settings page toggles and
  // reorders, so `sectionOrder` can render this screen in any arrangement.
  const homeSections = {
    glance: (
      <TriageRow
        dueToday={dueToday.length}
        needsReview={needsReview.length}
        overdue={overdue.length}
        unplanned={chores.filter(chore => chore.nextDueDate === null).length}
      />
    ),
    circle: circle.length > 0 && (
      <>
        <SectionHeader
          title={t('home.circle.title')}
          action={t('home.circle.action')}
          actionTo='/settings/circle'
        />
        <CircleStrip members={circle} />
      </>
    ),
    review: needsReview.length > 0 && (
      <>
        <SectionHeader
          title={
            canReviewTasks
              ? t('home.review.title')
              : t('home.review.pendingTitle', {
                  defaultValue: t('home.triage.needsReview'),
                })
          }
          action={t('home.review.action')}
          actionTo='/chores?filterId=pending-approval'
        />
        {/* The same card again — for a pending-approval task it renders
            approve / reject in the leading slot, so signing off happens
            here rather than one screen away. */}
        <HomeChoreList
          chores={needsReview.slice(0, REVIEW_LIMIT)}
          performers={performers}
          onAction={handleChoreAction}
          userProfile={userProfile}
        />
      </>
    ),
    overdue: overduePreview.length > 0 && (
      <>
        <SectionHeader
          title={t('home.overdue.title')}
          action={t('home.overdue.action')}
          actionTo='/chores?filterId=overdue'
        />
        <HomeChoreList
          chores={overduePreview}
          performers={performers}
          onAction={handleChoreAction}
          userProfile={userProfile}
        />
      </>
    ),
    nextUp: (
      <>
        {nextUp.length > 0 && (
          <>
            <SectionHeader
              title={t('home.nextUp.title')}
              action={t('home.nextUp.action')}
              actionTo='/chores?filterId=due-next-two-days'
            />
            <HomeChoreList
              chores={nextUp}
              performers={performers}
              onAction={handleChoreAction}
              userProfile={userProfile}
            />
          </>
        )}

        {nextUp.length === 0 && nextUpFallback.length > 0 && (
          <>
            <SectionHeader
              title={t('home.nextUpFallback.title')}
              action={t('home.nextUpFallback.action')}
              actionTo='/chores?filterId=due-this-week'
            />
            <HomeChoreList
              chores={nextUpFallback}
              performers={performers}
              onAction={handleChoreAction}
              userProfile={userProfile}
            />
          </>
        )}

        {showClearState && (
          <Sheet
            variant='soft'
            sx={{
              borderRadius: 'lg',
              display: 'grid',
              gap: 0.5,
              mt: 3.5,
              px: 2,
              py: 2,
            }}
          >
            <Typography level='title-sm'>{t('home.clear.title')}</Typography>
            <Typography level='body-sm' textColor='text.secondary'>
              {t('home.clear.body')}
            </Typography>
            <Button
              component={Link}
              to='/chores'
              variant='plain'
              size='sm'
              sx={{ justifySelf: 'start', mt: 0.5, mx: -1 }}
            >
              {t('home.clear.action')}
            </Button>
          </Sheet>
        )}
      </>
    ),
    filters: filterPulse.length > 0 && (
      <>
        <SectionHeader
          title={t('home.filters.title')}
          action={t('home.filters.action')}
          actionTo='/filters'
        />
        <FilterStrip filters={filterPulse} />
      </>
    ),
    projects: projectPulse.length > 0 && (
      <>
        <SectionHeader
          title={t('home.projects.title')}
          action={t('home.projects.action')}
          actionTo='/projects'
        />
        <ProjectStrip projects={projectPulse} />
      </>
    ),
  }

  return (
    <Container
      maxWidth='sm'
      sx={{ pb: getSafeBottomPadding(CAPTURE_CLEARANCE), pt: 1, px: 2 }}
    >
      <Box
        sx={{
          alignItems: 'flex-start',
          display: 'flex',
          gap: 1,
          justifyContent: 'space-between',
          mb: 1.5,
          mt: 0.5,
        }}
      >
        {sectionOrder.includes('greeting') ? (
          <Box>
            <Typography
              level='h2'
              sx={{
                fontSize: 'clamp(1.5rem, 6vw, 1.75rem)',
                letterSpacing: '-0.028em',
                lineHeight: 1.15,
                textWrap: 'balance',
              }}
            >
              {t(`home.verdict.${verdict.id}.title`, { count: verdict.count })}
            </Typography>
            <Typography
              level='body-sm'
              textColor='text.secondary'
              sx={{ mt: 0.5 }}
            >
              {t(`home.verdict.${verdict.id}.body`, { count: verdict.count })}
            </Typography>
          </Box>
        ) : (
          <Box />
        )}
        <IconButton
          component={Link}
          to='/settings/home-sections'
          variant='plain'
          color='neutral'
          size='sm'
          aria-label={t('home.customize.action')}
          sx={{ mt: 0.25 }}
        >
          <Tune sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {!hasAnyTask ? (
        <>
          <EmptyState
            icon={<AddTask />}
            title={t('home.firstTask.title')}
            description={t('home.firstTask.description')}
            primaryAction={{
              label: t('home.firstTask.action'),
              onClick: () => openCapture(null),
            }}
          />

          {circle.length === 0 && (
            <>
              <SectionHeader title={t('home.circle.title')} />
              <Sheet
                variant='soft'
                sx={{
                  borderRadius: 'lg',
                  display: 'grid',
                  gap: 1,
                  px: 2,
                  py: 2,
                }}
              >
                <Typography level='title-sm'>
                  {t('home.circle.emptyTitle')}
                </Typography>
                <Typography level='body-sm' textColor='text.secondary'>
                  {t('home.circle.emptyBody')}
                </Typography>
                <Button
                  component={Link}
                  to='/settings/circle'
                  variant='soft'
                  size='sm'
                  startDecorator={<GroupAdd />}
                  sx={{ justifySelf: 'start' }}
                >
                  {t('home.circle.emptyAction')}
                </Button>
              </Sheet>
            </>
          )}
        </>
      ) : (
        <>
          {sectionOrder
            .filter(id => id !== 'greeting')
            .map(id => (
              <Box key={id}>{homeSections[id]}</Box>
            ))}
        </>
      )}

      <CaptureBar onCapture={openCapture} />

      {captureOpen && (
        <TaskInput
          isModalOpen={captureOpen}
          initialMode={captureMode}
          onChoreUpdate={() => queryClient.invalidateQueries(['chores'])}
          onClose={() => {
            setCaptureOpen(false)
            setCaptureMode(null)
            queryClient.invalidateQueries(['chores'])
          }}
        />
      )}

      {/* The action menu's reschedule / reassign / complete-with-note flows all
          open these, so Home has to mount them for the menu to be usable. */}
      <ChoreModals
        activeModal={activeModal}
        modalChore={modalChore}
        membersData={membersData}
        onChangeDueDate={handleChangeDueDate}
        onCompleteWithPastDate={handleCompleteWithPastDate}
        onAssigneeChange={handleAssigneeChange}
        onCompleteWithNote={handleCompleteWithNote}
        onNudge={handleNudge}
        onClose={closeModal}
      />

      {confirmModelConfig?.isOpen && (
        <ConfirmationModal config={confirmModelConfig} />
      )}
    </Container>
  )
}

export default HomeView
