import { Check, GroupOutlined } from '@mui/icons-material'
import {
  Avatar,
  Box,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  List,
  ListItem,
  Option,
  Select,
  Stack,
  Typography,
} from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import { IMPORT_ASSIGN_STRATEGIES } from '../../utils/taskImport/importAssignment'
import EditorSection from '../ChoreEdit/EditorSection'

export default function ImportAssignmentFields({
  anyone,
  assignedTo,
  disabled,
  members,
  onAnyoneChange,
  onAssignedToChange,
  onStrategyChange,
  onUserIdsChange,
  strategy,
  userIds,
}) {
  const { t } = useTranslation('chores')
  const memberName = member =>
    member.displayName || member.username || t('assignee.unknown')
  const summary = anyone
    ? t('assignee.anyone')
    : members
        .filter(member => userIds.includes(member.userId))
        .map(memberName)
        .join(', ')
  const toggleMember = id => {
    const next = anyone
      ? [id]
      : userIds.includes(id)
        ? userIds.filter(value => value !== id)
        : [...userIds, id]
    onUserIdsChange(next)
    onAnyoneChange(next.length === 0)
  }
  const people = [
    {
      id: 'anyone',
      name: t('assignee.anyone'),
      selected: anyone,
      toggle: () => {
        onAnyoneChange(true)
        onUserIdsChange([])
      },
    },
    ...members.map(member => ({
      id: member.userId,
      name: memberName(member),
      selected: !anyone && userIds.includes(member.userId),
      toggle: () => toggleMember(member.userId),
    })),
  ]
  return (
    <EditorSection
      title={t('bulkImport.assignmentTitle')}
      icon={GroupOutlined}
      section='import-assignment'
      summary={summary}
      collapsible
      defaultOpen
      error={!anyone && !userIds.length}
    >
      <Stack spacing={2}>
        <Box>
          <Typography
            level='body-sm'
            textColor='text.tertiary'
            sx={{ mb: 1.5 }}
          >
            {t('templateLibrary.assignmentHint')}
          </Typography>
          <List
            orientation='horizontal'
            wrap
            aria-label={t('templateLibrary.who')}
            sx={{ '--List-gap': '8px', '--ListItem-radius': '24px', p: 0 }}
          >
            {people.map(person => (
              <ListItem
                key={person.id}
                sx={{
                  minHeight: 38,
                  px: 1.5,
                  border: '1px solid',
                  borderColor: person.selected
                    ? 'primary.outlinedBorder'
                    : 'neutral.outlinedBorder',
                  bgcolor: person.selected
                    ? 'primary.softBg'
                    : 'background.surface',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <Checkbox
                  overlay
                  disableIcon
                  variant='plain'
                  checked={person.selected}
                  disabled={disabled}
                  onChange={person.toggle}
                  label={
                    <Box
                      component='span'
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                    >
                      {person.id !== 'anyone' && (
                        <Avatar
                          aria-hidden='true'
                          color='primary'
                          sx={{ width: 22, height: 22, fontSize: 12 }}
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </Avatar>
                      )}
                      {person.name}
                      {person.selected && (
                        <Check aria-hidden='true' sx={{ fontSize: 16 }} />
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
          {!anyone && !userIds.length && (
            <FormControl error>
              <FormHelperText>
                {t('bulkImport.assigneeRequired')}
              </FormHelperText>
            </FormControl>
          )}
          {anyone && (
            <Typography
              level='body-xs'
              textColor='text.tertiary'
              sx={{ mt: 1 }}
            >
              {t('templateLibrary.anyoneHint')}
            </Typography>
          )}
        </Box>
        {!anyone && userIds.length > 1 && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl sx={{ flex: 1, minWidth: 0 }}>
                <FormLabel>{t('taskEditor.assignedNow')}</FormLabel>
                <Select
                  value={assignedTo}
                  disabled={disabled}
                  onChange={(_, value) => {
                    if (value !== null) onAssignedToChange(value)
                  }}
                >
                  {members
                    .filter(member => userIds.includes(member.userId))
                    .map(member => (
                      <Option key={member.userId} value={member.userId}>
                        {memberName(member)}
                      </Option>
                    ))}
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1, minWidth: 0 }}>
                <FormLabel>{t('taskEditor.nextAssignment')}</FormLabel>
                <Select
                  value={strategy}
                  disabled={disabled}
                  onChange={(_, value) => {
                    if (value) onStrategyChange(value)
                  }}
                >
                  {IMPORT_ASSIGN_STRATEGIES.map(value => (
                    <Option key={value} value={value}>
                      {t(`advancedOptions.strategy.${value}`)}
                    </Option>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Typography level='body-xs' textColor='text.tertiary'>
              {t(`templateLibrary.strategyHint.${strategy}`)}
            </Typography>
          </>
        )}
      </Stack>
    </EditorSection>
  )
}

ImportAssignmentFields.propTypes = {
  anyone: PropTypes.bool.isRequired,
  assignedTo: PropTypes.number,
  disabled: PropTypes.bool,
  members: PropTypes.array.isRequired,
  onAnyoneChange: PropTypes.func.isRequired,
  onAssignedToChange: PropTypes.func.isRequired,
  onStrategyChange: PropTypes.func.isRequired,
  onUserIdsChange: PropTypes.func.isRequired,
  strategy: PropTypes.string.isRequired,
  userIds: PropTypes.array.isRequired,
}
