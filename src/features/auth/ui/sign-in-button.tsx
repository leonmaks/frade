// import { signIn } from "next-auth/react"
// import { LogInIcon } from "lucide-react"

// "use server"


import { Button } from "@/shared/shadcn-ui/button"

import { signIn } from "../sa/sign-in"

export const SignInButton = async () => {
  const func__ = "SignInButton"
  console.log(func__, "Am I server?")
  return (
    <form action={signIn}>
      <Button type="submit">Sign In</Button>
    </form>
  )
}


// {

//   const handleSignIn = () => signIn()

//   return (
//     <Button
//       variant="outline"
//       onClick={handleSignIn}
//       className="rounded-full"
//     >
//       <LogInIcon className="w-4 h-4 mr-2" /> Sign In
//     </Button>
//   )
// }
