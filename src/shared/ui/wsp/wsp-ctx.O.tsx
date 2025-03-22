"use client"

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState
} from "react"

export type WspCtxType = {
  showLeftPanel: boolean
  setShowLeftPanel: Dispatch<SetStateAction<boolean>>
  showRightPanel: boolean
  setShowRightPanel: Dispatch<SetStateAction<boolean>>
}

const WspCtx = createContext<WspCtxType | null>(null)

export const useWspCtx = () => {
  const ctx = useContext(WspCtx)
  if (!ctx) {
    throw new Error("Cannot use outside of WspCtxProvider")
  }
  return ctx
}

export const WspCtxProvider = (
  { children }: { children: ReactNode }
) => {

  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)

  return (
    <WspCtx.Provider
      value={{
        showLeftPanel, setShowLeftPanel,
        showRightPanel, setShowRightPanel,
      }}
    >
      {children}
    </WspCtx.Provider>
  )
}
