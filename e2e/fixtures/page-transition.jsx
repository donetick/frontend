import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import PageTransition from '../../src/components/animations/PageTransition'
import PanelTransition from '../../src/components/animations/PanelTransition'
import CaptureBar from '../../src/views/Home/components/CaptureBar'
import ScrollHideFab from '../../src/views/components/ScrollHideFab'

function Fixture() {
  const navigate = useNavigate()
  const [disabled, setDisabled] = useState(false)
  const [panel, setPanel] = useState('first')
  window.navigateFixture = navigate
  window.disableTransitionFixture = setDisabled
  window.changePanelFixture = setPanel
  return (
    <>
      <nav>Stationary navigation</nav>
      <PageTransition disabled={disabled}>
        <Routes>
          <Route
            path='/'
            element={
              <main id='home' style={{ minHeight: '600vh' }}>
                <h1>Home</h1>
                <input defaultValue='Retained content' />
                <CaptureBar onCapture={() => {}} />
                <ScrollHideFab sx={{ bottom: 24, right: 24 }}>
                  <button data-testid='fixture-fab'>Add task</button>
                </ScrollHideFab>
              </main>
            }
          />
          <Route
            path='/projects'
            element={
              <main id='projects' style={{ minHeight: '600vh' }}>
                <h1>Projects</h1>
              </main>
            }
          />
        </Routes>
      </PageTransition>
      <PanelTransition active panelKey={panel} backwards={panel === 'first'}>
        <div
          data-testid='panel-content'
          style={{ height: panel === 'first' ? 40 : 120 }}
        >
          {panel}
        </div>
      </PanelTransition>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <MemoryRouter>
    <Fixture />
  </MemoryRouter>,
)
