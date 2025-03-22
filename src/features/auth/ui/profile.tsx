"use client"

import Link from "next/link"
import { LogOut, User } from "lucide-react"

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
import { Skeleton } from "@/shared/shadcn-ui/skeleton"

import { useAppSession } from "../session"
// import { ProfileAvatar, getProfileDisplayName } from "@/entities/user/profile"

import { useSignOut } from "../use-sign-out"
import { SignInButton } from "../ui/sign-in-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/shadcn-ui/avatar"

export function Profile() {
  const session = useAppSession()
  const { signOut, isPending: isLoadingSignOut } = useSignOut()

  if (session.status === "loading") {
    return <Skeleton className="w-8 h-8 rounded-full" />
  }

  if (session.status === "unauthenticated") {
    return <SignInButton />
  }

  const user = session?.data?.user

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="p-px rounded-full self-center h-8 w-8"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={session.data?.user.image || undefined} />
            <AvatarFallback>AC</AvatarFallback>
          </Avatar>
          {/* <ProfileAvatar profile={user} className="w-8 h-8" /> */}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mr-2 ">
        <DropdownMenuLabel>
          <p>My Account</p>
          <p className="text-xs text-muted-foreground overflow-hidden text-ellipsis">
            {user?.name || user?.email}
            {/* {user ? getProfileDisplayName(user) : undefined} */}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuGroup></DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/profile/1`}>
              {/* <Link href={`/profile/${user?.id}`}> */}
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLoadingSignOut}
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
