import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { HeroUIProvider } from '@heroui/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </BrowserRouter>,
)
