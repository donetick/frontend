import { Box, Chip } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import EditorSection from '../../ChoreEdit/EditorSection'

// Keep summaries visible when a section is closed; collapsing never removes a
// condition. Controls live in the body, outside the section's toggle button.
export default function FilterConditionSection({
  children,
  icon,
  label,
  onOperatorChange,
  operatorLabels = ['include', 'exclude'],
  selection,
  summary,
  type,
}) {
  const { t } = useTranslation('chores')
  const excluded = ['isNot', 'doesNotHave'].includes(selection.operator)
  const hasValues = (selection.values?.length ?? 0) > 0

  return (
    <EditorSection
      title={label}
      icon={icon}
      section={`filter-${type}`}
      collapsible
      summary={
        summary
          ? hasValues
            ? `${t(`filterBuilder.${operatorLabels[excluded ? 1 : 0]}`)} · ${summary}`
            : summary
          : t('filters:builder.anyValue')
      }
      sx={{ '&:last-child': { borderBottom: 0 } }}
    >
      {onOperatorChange && (
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
          {['is', 'isNot'].map((operator, index) => (
            <Chip
              key={operator}
              size='sm'
              variant={excluded === (index === 1) ? 'solid' : 'soft'}
              color={
                excluded === (index === 1)
                  ? index === 1
                    ? 'danger'
                    : 'primary'
                  : 'neutral'
              }
              onClick={() => onOperatorChange(operator)}
              slotProps={{
                action: { 'aria-pressed': excluded === (index === 1) },
              }}
            >
              {t(`filterBuilder.${operatorLabels[index]}`)}
            </Chip>
          ))}
        </Box>
      )}
      {children}
    </EditorSection>
  )
}
