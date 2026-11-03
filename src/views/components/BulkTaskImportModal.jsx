import { Alert, FormControl, FormLabel, Option, Select, Stack } from '@mui/joy'
import PropTypes from 'prop-types'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import { useUserProfile } from '../../queries/UserQueries'
import { useLabels } from '../Labels/LabelQueries'
import { useProjects, useProjectSections } from '../Projects/ProjectQueries'
import BulkTaskImport from './BulkTaskImport'

// Mount only while open so each launch starts a fresh import session.
export default function BulkTaskImportModal({ onClose }) {
  const { t } = useTranslation('chores')
  const { ResponsiveModal } = useResponsiveModal()
  const { data: userProfile } = useUserProfile()
  const {
    data: labels = [],
    isError: labelsError,
    isLoading: labelsLoading,
  } = useLabels()
  const {
    data: projects = [],
    isError: projectsError,
    isLoading: projectsLoading,
  } = useProjects()
  const [projectId, setProjectId] = useState('default')
  const [sectionId, setSectionId] = useState(null)
  const {
    data: sections = [],
    isError: sectionsError,
    isLoading: sectionsLoading,
  } = useProjectSections(projectId)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const handleClose = () => {
    if (!busyRef.current) onClose()
  }

  return (
    <ResponsiveModal
      open
      onClose={handleClose}
      size='lg'
      fullWidth
      title={t('bulkImport.title')}
    >
      <Stack spacing={2}>
        <FormControl>
          <FormLabel>{t('bulkImport.project')}</FormLabel>
          <Select
            value={projectId}
            disabled={busy || projectsLoading || projectsError}
            onChange={(_, value) => {
              setProjectId(value)
              setSectionId(null)
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
          <FormControl>
            <FormLabel>{t('bulkImport.section')}</FormLabel>
            <Select
              value={sectionId ?? ''}
              disabled={busy || sectionsLoading || sectionsError}
              onChange={(_, value) => setSectionId(value || null)}
            >
              <Option value=''>{t('bulkImport.noSection')}</Option>
              {sections.map(section => (
                <Option key={section.id} value={section.id}>
                  {section.name}
                </Option>
              ))}
            </Select>
          </FormControl>
        )}
        {(labelsError || projectsError || sectionsError) && (
          <Alert color='danger'>{t('bulkImport.loadFailed')}</Alert>
        )}
        {!labelsLoading &&
          !projectsLoading &&
          !sectionsLoading &&
          !labelsError &&
          !projectsError &&
          !sectionsError && (
            <BulkTaskImport
              labels={labels}
              userProfile={userProfile}
              projectId={projectId}
              sectionId={sectionId}
              onBusyChange={value => {
                busyRef.current = value
                setBusy(value)
              }}
              onClose={handleClose}
            />
          )}
      </Stack>
    </ResponsiveModal>
  )
}

BulkTaskImportModal.propTypes = {
  onClose: PropTypes.func.isRequired,
}
