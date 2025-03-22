"use client"

import { ReactNode, useEffect } from "react"

import { LayoutCtxProvider, useLayoutCtx } from "./LayoutCtx"
// import { LayoutHeader } from "../../../app/_root/ui/root-header"
import { LayoutSidebar } from "./LayoutSidebar"
import { LayoutWsp } from "./LayoutWsp"
import { LayoutFooter } from "./LayoutFooter"

interface LayoutProps {
  children: ReactNode
  sidebar?: ReactNode
  leftPanel?: ReactNode
  showLeftPanel?: boolean
  showRightPanel?: boolean
}

const LayoutComponent = ({
  children,
  sidebar,
  leftPanel,
  showLeftPanel: showLP = true,
  showRightPanel: showRP = true,
}: LayoutProps) => {
  const {
    showSidebar,
    setShowLeftPanel,
    setShowRightPanel,
  } = useLayoutCtx()

  useEffect(() => {
    setShowLeftPanel(showLP || false)
    setShowRightPanel(showRP || false)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* <LayoutHeader /> */}

      <div className="flex h-[calc(100%-5rem)]">

        {showSidebar && <LayoutSidebar />}

        <LayoutWsp leftPanel={leftPanel}>
          {children}
        </LayoutWsp>
      </div>

      <LayoutFooter />
    </div>
  )
}

export const Layout = ({
  children,
  sidebar,
  leftPanel,
  showLeftPanel,
  showRightPanel,
}: LayoutProps) => (

  <>
    <LayoutCtxProvider>
      <LayoutComponent
        sidebar={sidebar}
        leftPanel={leftPanel}
        showLeftPanel={showLeftPanel}
        showRightPanel={showRightPanel}
      >
        {children}
      </LayoutComponent>
    </LayoutCtxProvider>
  </>
)
