import { useTranslation } from 'react-i18next'

import LogoSVG from '@/assets/logo.svg'
const Logo = ({ size = '128px' }) => {
  const { t } = useTranslation('common')
  return (
    <div className='logo'>
      <img src={LogoSVG} alt={t('logoAlt')} width={size} height={size} />
    </div>
  )
}
export default Logo
