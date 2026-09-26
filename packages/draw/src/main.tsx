import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DiagramEditor } from './editor/DiagramEditor'
import './style.css'
createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <DiagramEditor />
  </StrictMode>,
)
