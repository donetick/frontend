import { FormControl, FormHelperText, FormLabel, Switch } from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

ItemPrivacyField.propTypes = {
  isShared: PropTypes.bool.isRequired,
  kind: PropTypes.oneOf(['label', 'filter']),
  onChange: PropTypes.func.isRequired,
}

export default function ItemPrivacyField({ isShared, kind, onChange }) {
  const { t } = useTranslation('common')

  return (
    <FormControl sx={{ my: 2 }}>
      <FormLabel>
        <Switch
          checked={isShared}
          onChange={event => onChange(event.target.checked)}
          slotProps={{ input: { 'aria-label': t('itemPrivacy.share') } }}
          sx={{ mr: 1 }}
        />
        {t('itemPrivacy.share')}
      </FormLabel>
      <FormHelperText>
        {t(isShared ? 'itemPrivacy.sharedHint' : 'itemPrivacy.privateHint')}
        {kind === 'label' && ` ${t('itemPrivacy.labelHint')}`}
      </FormHelperText>
    </FormControl>
  )
}
