import { SidebarProvider } from "@/shared/shadcn-ui/sidebar"

import { HomeNavbar, HomeSidebar } from "./_home"

type HomeLayoutProps = {
  children: React.ReactNode
}

export default function HomeLayout({
  children
}: HomeLayoutProps) {
  return (
    <SidebarProvider>
      <div className="w-full bg-blue-200">
        <HomeNavbar />
        <div className="flex min-h-screen pt-[4rem]">
          <HomeSidebar />
          <main className="flex-1 overflow-y-auto bg-amber-200">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
