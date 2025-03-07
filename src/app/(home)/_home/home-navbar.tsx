import Image from "next/image"
import Link from "next/link"

import { SidebarTrigger } from "@/shared/shadcn-ui/sidebar"
import { AuthButton } from "@/features/auth"

import { SearchInput } from "./search-input"

export const HomeNavbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 flex items-center px-2 pr-5 z-50">
      <div className="flex items-center gap-4 w-full">

        {/* Menu & Logo */}
        <div className="flex items-center flex-shrink-0 bg-orange-200">
          <SidebarTrigger />
          <Link href="/">
            <div className="p-4 flex items-center gap-1">
              <Image src="/logo.svg" alt="Logo" width={32} height={32} />
              <p className="text-2xl font-semibold tracking-tight">FRADE</p>
            </div>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="flex-1 flex justify-center max-w-[720px] mx-auto bg-orange-200">
          <SearchInput />
        </div>

        <div className="flex-shrink-0 items-center flex gap-4">
          <AuthButton />
        </div>
      </div>
    </nav>
  )
}
