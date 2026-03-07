import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.documentElement
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'light') {
  root.classList.remove('dark')
} else if (savedTheme === 'dark') {
  root.classList.add('dark')
} else {
  // Default to system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.classList.add('dark')
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
