import LogoSVG from '@/assets/logo.svg'
const Logo = ({ size = '128px' }) => {
  return (
    <div className='logo'>
      <img src={LogoSVG} alt='logo' width={size} height={size} />
    </div>
  )
}
export default Logo
