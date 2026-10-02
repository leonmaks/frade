import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { DiagramEditor } from './editor/DiagramEditor'
import { installVisualApi } from './visual/api'
import './style.css'

const root = document.querySelector('#editor-visual-root') as HTMLElement
createRoot(root).render(
  createElement(StrictMode, null, createElement(DiagramEditor, { onGraphReady: installVisualApi })),
)
