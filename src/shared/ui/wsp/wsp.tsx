import { ReactNode } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/shared/shadcn-ui/resizable"

import { ScrollablePanel } from "@/shared/ui/scrollable-panel"

interface WspProps {
  children: ReactNode
  leftPanel?: ReactNode
  rightPanel?: ReactNode
  autoSaveId?: string
}

export const Wsp = ({
  children,
  leftPanel,
  rightPanel,
  autoSaveId = "wsp"
}: WspProps) => {

  // TODO: Refactor to HorizontalResizablePanels

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId={autoSaveId}
      >

        {leftPanel && (
          <>
            <ResizablePanel
              order={1}
              id="leftPanel"
              defaultSize={rightPanel ? 20 : 50}
              minSize={5}
              collapsible
              collapsedSize={0}
              className=""
            >
              <ScrollablePanel classNames=" mr-0.5">
                {leftPanel}
              </ScrollablePanel>
            </ResizablePanel>

            <ResizableHandle
              className="hover:w-1 hover:bg-sky-400"
              withHandle
            />
          </>
        )}

        <ResizablePanel
          id="mainPanel"
          defaultSize={50}
          order={2}
        >

          <ScrollablePanel classNames=" mr-0.5">
            {children}
          </ScrollablePanel>
        </ResizablePanel>

        {rightPanel && (
          <>
            <ResizableHandle
              className="hover:w-1 hover:bg-sky-400"
              withHandle
            />

            <ResizablePanel
              order={3}
              id="rightPanel"
              defaultSize={leftPanel ? 35 : 50}
              minSize={5}
              collapsible
              collapsedSize={0}
            >
              <ScrollablePanel classNames=" mr-0.5">
                {rightPanel}
              </ScrollablePanel>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </>
  )
}
