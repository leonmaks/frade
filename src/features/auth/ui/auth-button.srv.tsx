import { SessionProvider } from "next-auth/react"

import { AUTH_BASE_PATH } from "@/shared/config"
import { auth } from ".."
import { AuthButton as AuthButtonCli } from "./auth-button.cli"

export const AuthButton = async () => {
  const session = await auth()

  return (
    <SessionProvider basePath={AUTH_BASE_PATH} session={session}>
      <AuthButtonCli />
    </SessionProvider>
  )
}
