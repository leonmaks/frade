// import { UserCircleIcon } from "lucide-react"

import { auth } from "../auth"
import { SignInButton } from "./sign-in-button"
import { UserButton } from "./user-button"

// import { Button } from "@/shared/shadcn-ui/button"

export const AuthButton = async () => {
  const func__ = "AuthButton"
  const session = await auth()
  const user = session?.user

  console.log(func__, "Am I server?", "user=", user)

  return user ? <UserButton user={user} /> : <SignInButton />

  // return (
  //   <>
  //     {user ? <UserButton user={user} /> : <SignInButton />}
  //   </>
  // )
}

// <Button
//   variant="outline"
//   className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 border-blue-500 rounded-full shadow-none"
// >
//   <UserCircleIcon />
//   Sign In
// </Button>
