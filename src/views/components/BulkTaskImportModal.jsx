import { FolderOutlined } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormLabel,
  Option,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import useConfirmationModal from '../../hooks/useConfirmationModal'
import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { filterMembersForProject } from '../../utils/ProjectAccess'
import EditorSection from '../ChoreEdit/EditorSection'
import { useLabels } from '../Labels/LabelQueries'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import { useProjects, useProjectSections } from '../Projects/ProjectQueries'
import BulkTaskImport from './BulkTaskImport'

// Keep the importer mounted while destination queries change: switching a
// project must never discard names, assignment choices, or partial results.
export default function BulkTaskImportModal({
  initialTemplate,
  onBack,
  onClose,
  templateTitle,
}) {
  const { t } = useTranslation('chores')
  const { ResponsiveModal } = useResponsiveModal()
  const { confirmModalConfig, showConfirmation } = useConfirmationModal()
  const profileQuery = useUserProfile()
  const membersQuery = useCircleMembers()
  const labelsQuery = useLabels()
  const projectsQuery = useProjects()
  const [projectId, setProjectId] = useState('default')
  const [sectionId, setSectionId] = useState(null)
  const [configurationLocked, setConfigurationLocked] = useState(false)
  const sectionsQuery = useProjectSections(projectId)
  const [busy, setBusy] = useState(false)
  const [footerContainer, setFooterContainer] = useState(null)
  const busyRef = useRef(false)
  const handleClose = () => {
    if (!busyRef.current) onClose()
  }
  const projects = projectsQuery.data ?? []
  const sections = sectionsQuery.data ?? []
  const project = projects.find(project => project.id === projectId)
  const loading =
    profileQuery.isLoading ||
    membersQuery.isLoading ||
    labelsQuery.isLoading ||
    projectsQuery.isLoading
  const failed =
    profileQuery.error ||
    membersQuery.error ||
    labelsQuery.isError ||
    projectsQuery.isError ||
    (!loading && !profileQuery.data?.id)
  const destinationSummary = [
    project?.name ?? t('addTask.defaultProject'),
    sections.find(section => section.id === sectionId)?.name,
  ]
    .filter(Boolean)
    .join(' / ')
  const retry = () => {
    profileQuery.refetch()
    membersQuery.handleRefetch()
    labelsQuery.refetch()
    projectsQuery.refetch()
  }
  const destination = (
    <EditorSection
      section='import-destination'
      title={t('templateLibrary.location')}
      icon={FolderOutlined}
      summary={destinationSummary}
      collapsible
      defaultOpen={!initialTemplate}
      error={sectionsQuery.isError}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl sx={{ flex: 1, minWidth: 0 }}>
          <FormLabel>{t('bulkImport.project')}</FormLabel>
          <Select
            value={projectId}
            disabled={busy || configurationLocked}
            onChange={(_, value) => {
              if (value !== null) {
                setProjectId(value)
                setSectionId(null)
              }
            }}
          >
            <Option value='default'>{t('addTask.defaultProject')}</Option>
            {projects.map(project => (
              <Option key={project.id} value={project.id}>
                {project.name}
              </Option>
            ))}
          </Select>
        </FormControl>
        {projectId !== 'default' && (
          <FormControl sx={{ flex: 1, minWidth: 0 }}>
            <FormLabel>{t('bulkImport.section')}</FormLabel>
            <Select
              value={sectionId ?? ''}
              disabled={
                busy ||
                configurationLocked ||
                sectionsQuery.isLoading ||
                sectionsQuery.isError
              }
              onChange={(_, value) => setSectionId(value || null)}
            >
              <Option value=''>{t('bulkImport.noSection')}</Option>
              {sections.map(section => (
                <Option key={section.id} value={section.id}>
                  {section.name}
                </Option>
              ))}
            </Select>
            {sectionsQuery.isLoading && (
              <Typography level='body-xs' role='status'>
                {t('templateLibrary.loadingSections')}
              </Typography>
            )}
          </FormControl>
        )}
      </Stack>
      {sectionsQuery.isError && (
        <Alert
          color='danger'
          endDecorator={
            <Button
              size='sm'
              variant='plain'
              color='danger'
              onClick={() => sectionsQuery.refetch()}
            >
              {t('templateLibrary.tryAgain')}
            </Button>
          }
        >
          {t('bulkImport.loadFailed')}
        </Alert>
      )}
    </EditorSection>
  )

  return (
    <>
      <ResponsiveModal
        open
        onClose={handleClose}
        size='lg'
        fullWidth
        mobilePresentation='fullscreen'
        title={templateTitle ?? t('bulkImport.title')}
        closeOnBackdrop={!busy}
        closeOnEscape={!busy}
        showCloseButton={!busy}
        footer={
          !loading && !failed ? <Box ref={setFooterContainer} /> : undefined
        }
      >
        {loading ? (
          <Stack
            spacing={2}
            aria-label={t('templateLibrary.loading')}
            role='status'
          >
            <Typography level='body-sm'>
              {t('templateLibrary.loading')}
            </Typography>
            {[0, 1, 2].map(index => (
              <Skeleton
                key={index}
                variant='rectangular'
                height={100}
                sx={{ borderRadius: 'md' }}
              />
            ))}
          </Stack>
        ) : failed ? (
          <Alert
            color='danger'
            endDecorator={
              <Button color='danger' variant='plain' onClick={retry}>
                {t('templateLibrary.tryAgain')}
              </Button>
            }
          >
            {t('bulkImport.loadFailed')}
          </Alert>
        ) : (
          <BulkTaskImport
            initialTemplate={initialTemplate}
            destination={destination}
            destinationSummary={destinationSummary}
            footerContainer={footerContainer}
            configurationPending={
              sectionsQuery.isLoading || sectionsQuery.isError
            }
            members={filterMembersForProject(
              membersQuery.data?.res ?? [],
              project,
            )}
            onConfigurationLock={setConfigurationLocked}
            labels={labelsQuery.data ?? []}
            userProfile={profileQuery.data}
            projectId={projectId}
            sectionId={sectionId}
            onBack={
              onBack
                ? () =>
                    showConfirmation(
                      t('templateLibrary.resetBody'),
                      t('templateLibrary.resetTitle'),
                      onBack,
                      t('templateLibrary.backToTasks'),
                      t('templateLibrary.keepEditing'),
                    )
                : undefined
            }
            onBusyChange={value => {
              busyRef.current = value
              setBusy(value)
            }}
            onClose={handleClose}
          />
        )}
      </ResponsiveModal>
      <ConfirmationModal config={confirmModalConfig} />
    </>
  )
}

BulkTaskImportModal.propTypes = {
  initialTemplate: PropTypes.string,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  templateTitle: PropTypes.string,
}
