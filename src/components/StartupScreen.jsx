import logo from '../assets/logo.svg'

// Keep this markup in sync with index.html's pre-JavaScript startup screen.
// No translations or UI providers: either could suspend during startup.
const StartupScreen = () => {
  let isChinese = false
  try {
    const stored = window.localStorage.getItem('language')
    const language = stored
      ? JSON.parse(stored)
      : window.localStorage.getItem('i18nextLng')
    isChinese =
      typeof language === 'string' && language.toLowerCase().startsWith('zh')
  } catch {
    // Storage may be unavailable; keep the provider-free English fallback.
  }
  return (
    <div
      className='startup-screen'
      role='status'
      aria-label={isChinese ? '正在加载 Donetick' : 'Loading Donetick'}
    >
      <div className='startup-screen__content'>
        <div className='startup-screen__visual' aria-hidden='true'>
          <div className='startup-screen__halo' />
          <div className='startup-screen__card startup-screen__card--back'>
            <span className='startup-screen__check'>✓</span>
            <span className='startup-screen__lines'>
              <span />
              <span />
            </span>
          </div>
          <div className='startup-screen__mascot'>
            <img src={logo} width='88' height='88' alt='' />
          </div>
          <div className='startup-screen__card startup-screen__card--front'>
            <span className='startup-screen__check'>✓</span>
            <span className='startup-screen__lines'>
              <span />
              <span />
            </span>
          </div>
          <span className='startup-screen__spark startup-screen__spark--one' />
          <span className='startup-screen__spark startup-screen__spark--two' />
        </div>
        <div className='startup-screen__copy'>
          <div className='startup-screen__name'>
            Done<span>tick</span>
          </div>
          <div className='startup-screen__caption'>
            {isChinese ? '正在准备' : 'Getting things ready'}
          </div>
        </div>
        <div className='startup-screen__dots' aria-hidden='true'>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}

export default StartupScreen
