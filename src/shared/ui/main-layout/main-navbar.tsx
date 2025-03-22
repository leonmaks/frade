import { ReactNode } from "react"
import Link from "next/link"

import { SidebarTrigger } from "@/shared/shadcn-ui/sidebar"

import { MainLogo } from "@/features/main-logo"

type MainNavbarProps = {
  navbarContent?: ReactNode
  showSidebarTrigger?: boolean
  actions?: ReactNode
  authButton?: ReactNode
}

export const MainNavbar = async ({
  navbarContent,
  showSidebarTrigger = false,
  actions,
  authButton,
}: MainNavbarProps) => {
  // const func__ = "MainNavbar"

  // console.log(func__, { authButton })

  return (
    <div className="flex items-center gap-4 w-full">

      {/* Menu & Logo */}
      <div className="flex items-center flex-shrink-0">

        {/* Sidebar Trigger */}
        {showSidebarTrigger && <SidebarTrigger />}

        <Link href="/">
          <MainLogo />
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex-1 flex justify-center mx-auto bg-orange-200">

        {/* Navbar Content */}
        {navbarContent}
      </div>

      <div className="flex-shrink-0 items-center flex gap-4">
        {actions}
        {authButton === undefined ? (
          // TODO: Implement simple AuthButton
          <div>
            SimpleAuthButton!
          </div>
        ) : authButton}
      </div>
    </div >
  )
}
