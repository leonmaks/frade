"use client"

import { signOut } from "next-auth/react"

import { Button } from "@/shared/shadcn-ui/button"

export const SignOutButton = () => {

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="flex justify-center">
      <Button variant="destructive" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  )
}
