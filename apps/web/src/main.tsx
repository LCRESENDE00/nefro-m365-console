import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* No GitHub Pages o site vive sob /nefro-m365-console/. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
