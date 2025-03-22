import { Sidebar, SidebarContent } from "@/shared/shadcn-ui/sidebar"

type MainSidebarProps = {
  sidebarContent: React.ReactNode
}

export const MainSidebar = ({
  sidebarContent,
}: MainSidebarProps) => {
  return (
    <Sidebar className="pt-14 z-40 border-none" collapsible="icon">
      <SidebarContent className="bg-background">
        {sidebarContent}
      </SidebarContent>
    </Sidebar>
  )
}
