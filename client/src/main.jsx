import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { setupAuthFetchInterceptor } from './utils/setupAuthFetch'

setupAuthFetchInterceptor()

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <App />
  </StrictMode>
)
