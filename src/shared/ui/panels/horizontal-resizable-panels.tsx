import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/shared/shadcn-ui/resizable"

type HorizontalResizablePanelsProps = {
  leftPanel: React.ReactNode,
  rightPanel?: React.ReactNode,
  children: React.ReactNode,
}

export const HorizontalResizablePanels = async ({
  leftPanel,
  rightPanel,
  children,
}: HorizontalResizablePanelsProps) => {

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="tasks-panels"
      >

        <ResizablePanel
          order={1}
          id="leftPanel"
          defaultSize={rightPanel ? 20 : 30}
          minSize={5}
          collapsible
          collapsedSize={0}
          className=""
        >
          {leftPanel}
        </ResizablePanel>

        <ResizableHandle
          className="w-0.5 hover:bg-sky-400"
          withHandle
        />

        <ResizablePanel
          order={2}
          id="mainPanel"
          defaultSize={rightPanel ? 50 : 70}
        >
          {children}
        </ResizablePanel>


        {rightPanel && (
          <>
            <ResizableHandle
              className="w-0.5 hover:bg-sky-400"
              withHandle
            />

            <ResizablePanel
              order={3}
              id="rightPanel"
              defaultSize={35}
              minSize={5}
              collapsible
              collapsedSize={0}
            >
              {rightPanel}
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </>
  )
}
