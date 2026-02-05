import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Router from './router'
import { authStore } from './store'

authStore.hydrate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="app-shell">
      <div className="app-surface">
        <Router />
      </div>
    </div>
  </StrictMode>,
)