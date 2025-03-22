import { Separator } from "@/shared/shadcn-ui/separator"
import { MainLayout } from "@/shared/ui/main-layout"

import { GlobalSearchInput } from "@/features/global-search-input"

import { MainSection } from "../../features/global-sidebar-content/main-section"
import { PersonalSection } from "../../features/global-sidebar-content/personal-section"

type HomeLayoutProps = {
  children: React.ReactNode
}

const SidebarContent = () => {
  return (
    <>
      <MainSection />
      <Separator />
      <PersonalSection />
    </>
  )
}

export default function HomeLayout({
  children
}: HomeLayoutProps) {
  return (
    <MainLayout
      navbarContent={<GlobalSearchInput />}
      sidebarContent={<SidebarContent />}
    >
      {children}
    </MainLayout>
  )
}
