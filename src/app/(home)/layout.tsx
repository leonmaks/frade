import { MainLayout } from "@/shared/ui/main-layout"
import { ToggleTheme } from "@/shared/theme"

import { GlobalSearchInput } from "@/features/global-search-input"
import { GlobalSidebarContent } from "@/features/global-sidebar-content"
import { Profile } from "@/features/auth"
import { AuthButton } from "@/features/auth/ui/auth-button"

type HomeLayoutProps = {
  children: React.ReactNode
}

export default async function HomeLayout({
  children
}: HomeLayoutProps) {
  return (
    <MainLayout
      navbarContent={<GlobalSearchInput />}
      sidebarContent={<GlobalSidebarContent />}
      authButton={<AuthButton />}
      actions={<ToggleTheme />}
    >
      {children}
    </MainLayout>
  )
}
