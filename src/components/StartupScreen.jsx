// Keep this markup in sync with index.html's pre-JavaScript startup screen.
// No translations or UI providers: either could suspend during startup.
const StartupScreen = () => (
  <div className='startup-screen' role='status' aria-label='Loading Donetick'>
    <span className='startup-screen__name'>Donetick</span>
    <span className='startup-screen__spinner' aria-hidden='true' />
  </div>
)

export default StartupScreen
