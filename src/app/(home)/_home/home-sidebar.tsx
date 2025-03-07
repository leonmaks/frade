import { Sidebar, SidebarContent } from "@/shared/shadcn-ui/sidebar"
import { Separator } from "@/shared/shadcn-ui/separator"

import { MainSection } from "./main-section"
import { PersonalSection } from "./personal-section"

export const HomeSidebar = () => {
  return (
    <Sidebar className="pt-16 z-40 border-none" collapsible="icon">
      <SidebarContent className="bg-background">
        <MainSection />
        <Separator />
        <PersonalSection />
      </SidebarContent>
    </Sidebar>
  )
}
