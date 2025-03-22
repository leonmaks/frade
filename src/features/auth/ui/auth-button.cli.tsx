"use client"

import { useSession } from "next-auth/react"

import { Button } from "@/shared/shadcn-ui/button"

import { signIn, signOut } from "../sa"

export const AuthButton = () => {
  const session = useSession()

  return session?.data?.user ? (
    <Button
      variant="secondary"
      className="h-10 rounded-full"
      onClick={async () => {
        console.log("Before Sign Out")
        await signOut()
        console.log("After Sign Out")
        console.log("Before Sign In")
        // TODO: Sign In doesn't work - Why?
        await signIn()
        console.log("After Sign In")
      }}
    >
      {session.data?.user?.name} : SignOut
    </Button>
  ) : (
    <Button
      variant="secondary"
      className="h-10 rounded-full"
      onClick={async () => {
        await signIn()
      }}
    >
      Sign In
    </Button>
  )
}
