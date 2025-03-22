import { ReactNode } from "react"

import { SidebarProvider } from "@/shared/shadcn-ui/sidebar"

import { MainNavbar } from "./main-navbar"
import { MainSidebar } from "./main-sidebar"
import { ComposeChildren } from "@/shared/utils/react"

type MainLayoutProps = {
  navbarContent?: ReactNode
  sidebarContent?: ReactNode
  sidebarDefaultOpen?: boolean
  authButton?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export const MainLayoutContent = async ({
  navbarContent,
  sidebarContent,
  authButton,
  actions,
  children
}: MainLayoutProps) => (
  <div className="w-full">

    {/* Navbar */}
    <header className="fixed top-0 left-0 right-0 h-14 flex items-center px-2 pr-5 z-50">
      <MainNavbar
        navbarContent={navbarContent}
        showSidebarTrigger={sidebarContent ? true : false}
        authButton={authButton}
        actions={actions}
      />
    </header>

    <div className="flex min-h-screen pt-14">

      {/* Sidebar */}
      {sidebarContent && <MainSidebar sidebarContent={sidebarContent} />}

      {/* Children */}
      <main
        className="flex-1 overflow-y-auto"
      >
        {children}
      </main>
    </div>
  </div>
)

export const MainLayout = ({
  navbarContent,
  sidebarContent,
  sidebarDefaultOpen = false,
  authButton,
  actions,
  children
}: MainLayoutProps) => (

  <ComposeChildren>
    {sidebarContent && <SidebarProvider defaultOpen={sidebarDefaultOpen} />}
    <MainLayoutContent
      navbarContent={navbarContent}
      sidebarContent={sidebarContent}
      authButton={authButton}
      actions={actions}
    >
      {children}
    </MainLayoutContent>
  </ComposeChildren>
)
