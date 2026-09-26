import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Workbench } from '@frade/ui-workspace'
import type { WorkbenchClient } from '@frade/repository-api/workbench'
import type { DesktopApi, Health } from '@frade/runtime-contracts'
import './style.css'
import '@frade/ui-workspace/styles.css'
declare global {
  interface Window {
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
createRoot(document.getElementById('root')!).render(<App />)
