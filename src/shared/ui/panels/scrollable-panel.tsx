import { ReactNode } from "react"

import { cn } from "@/shared/lib/shadcn-ui-utils"

export const ScrollablePanel = ({
  children,
  classNames,
  innerClassNames,
}: {
  children: ReactNode
  classNames?: string
  innerClassNames?: string
}) => (

  <div
    className={cn(
      "invisible w-full h-full overflow-y-auto overflow-x-auto p-0.5 hover:visible",
      classNames)}
  >

    <div
      className={cn("visible w-full", innerClassNames)}
    >
      {children}
    </div>
  </div>
)
