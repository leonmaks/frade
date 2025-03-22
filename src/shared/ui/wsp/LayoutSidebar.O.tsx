import { DatabaseIcon, FilesIcon, FolderTreeIcon, NetworkIcon, SettingsIcon, ShellIcon } from "lucide-react"

import { cn } from "@/shared/shadcn-ui/utils"
import { Button } from "@/shared/shadcn-ui/button"

import {
  ApiIntegrationConnectionIcon,
  ApplicationIcon,
  BusinessBuildingIcon,
  Cog8ToothIcon,
  Data2Icon,
  HomeIcon
} from "@/shared/icons"

export const LayoutSidebar = ({
  className,
}: {
  className?: string
}) => {

  return (
    <aside
      className={cn(
        "flex flex-col items-center justify-between w-16 bg-gray-50 shrink-0",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1">

        <Button variant="ghost" asChild className="w-10 h-10 p-2 rounded-full">
          <HomeIcon strokeWidth={1} />
        </Button>

        <Button variant="ghost" asChild className="w-10 h-10 p-2 rounded-full">
          <BusinessBuildingIcon />
        </Button>

        <Button variant="ghost" asChild className="w-10 h-10 p-2 rounded-full">
          <ApplicationIcon />
        </Button>

        <Button variant="ghost" asChild className="w-10 h-10 p-2 rounded-full">
          <Data2Icon />
        </Button>

        <Button variant="ghost" asChild className="w-10 h-10 p-2 rounded-full">
          <ApiIntegrationConnectionIcon />
        </Button>


        <div className="flex items-center justify-center w-10 h-10">
          <FilesIcon />
        </div>

        <div className="flex items-center justify-center w-10 h-10">
          <FolderTreeIcon />
        </div>

        <div className="flex items-center justify-center w-10 h-10">
          <DatabaseIcon />
        </div>

        <div className="flex items-center justify-center w-10 h-10">
          <NetworkIcon />
        </div>

        <div className="flex items-center justify-center w-10 h-10">
          <ShellIcon />
        </div>

        <div className="flex items-center justify-center w-10 h-10">
          <SettingsIcon />
        </div>

      </div>

      <div>
        <Button variant="ghost" className="w-10 h-10 p-2 rounded-full">
          <Cog8ToothIcon strokeWidth={1} />
        </Button>
      </div>
    </aside>
  )
}
