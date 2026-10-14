import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Workbench } from '@frade/ui-workspace'
import { ThemeControllerContext } from '@frade/ui-workspace/design/theme'
import { bootstrapPresentation } from './presentation-bootstrap'
import type { WorkbenchClient } from '@frade/repository-api/workbench'
import type { DesktopApi, Health, PresentationApi } from '@frade/runtime-contracts'
import './style.css'
import '@frade/ui-workspace/styles.css'
import '@frade/ui-workspace/design/tokens.css'
import '@frade/ui-workspace/design/theme/theme-consumers.css'
const presentation = bootstrapPresentation(window.fradePresentation, document.documentElement)
declare global {
  interface Window {
    fradePresentation: PresentationApi
    frade: DesktopApi
    fradeWorkbench: WorkbenchClient & { onCloseRequested: (listener: () => void) => () => void }
  }
}
function App() {
  const [health, setHealth] = useState<Health>({ state: 'starting', sequence: 0 })
  useEffect(() => {
    let active = true
    const update = (next: Health) => {
      if (active) setHealth((previous) => (next.sequence >= previous.sequence ? next : previous))
    }
    const off = window.frade.events.subscribe(update)
    void window.frade.runtime
      .getHealth()
      .then(update)
      .catch(() => update({ state: 'unavailable', sequence: 0 }))
    return () => {
      active = false
      off()
    }
  }, [])
  return <Workbench client={window.fradeWorkbench} health={health.state} />
}
createRoot(document.getElementById('root')!).render(
  <ThemeControllerContext.Provider value={presentation.controller}>
    <App />
  </ThemeControllerContext.Provider>,
)
void presentation.ready().catch((error) => console.error('Presentation startup failed', error))
window.addEventListener('pagehide', () => presentation.dispose(), { once: true })
