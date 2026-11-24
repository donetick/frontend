import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import PageTransition from '../../src/components/animations/PageTransition'
import CaptureBar from '../../src/views/Home/components/CaptureBar'
import ScrollHideFab from '../../src/views/components/ScrollHideFab'

function Fixture() {
  const navigate = useNavigate()
  window.navigateFixture = navigate
  return (
    <>
      <nav>Stationary navigation</nav>
      <PageTransition>
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
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <MemoryRouter>
    <Fixture />
  </MemoryRouter>,
)
