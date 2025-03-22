import { User } from "next-auth"
import Image from "next/image"
import Link from "next/link"
import {
  LockIcon,
  LogOut,
  Settings
} from "lucide-react"

import { Button } from "@/shared/shadcn-ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/shadcn-ui/dropdown-menu"

import { signOut } from "../sa/sign-out"

import avatarPlaceholder from "@/assets/images/avatar_placeholder.png"
import { UserRole } from "@prisma/client"

interface UserButtonProps {
  user: User
}

export const UserButton = async ({ user }: UserButtonProps) => {
  const func__ = "UserButton"
  console.log(func__, { user })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" className="flex-none rounded-full">
          <Image
            src={user.image || avatarPlaceholder}
            alt="User profile picture"
            width={50}
            height={50}
            className="aspect-square rounded-full bg-background object-cover"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>{user.name || "User"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>

          {user.role === UserRole.Admin && <DropdownMenuItem asChild>
            <Link href="/admin">
              <LockIcon className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </DropdownMenuItem>}

        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={signOut}>
            <button className="flex w-full items-center">
              <LogOut className="mr-2 h-4 w-4" />{" "}
              Sign Out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
