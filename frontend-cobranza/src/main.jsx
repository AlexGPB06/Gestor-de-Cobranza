import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // <-- Esta línea es vital para que carguen los estilos
import './apiClient.js' // <-- Registra el interceptor que manda el token en cada petición
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)