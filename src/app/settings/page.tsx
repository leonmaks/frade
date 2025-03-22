import { Metadata } from "next"
import { redirect } from "next/navigation"

import UserSettings from "./settings-page.cli"
import { sessionGuard } from "@/features/auth/session/session-guard.srv"
import { getAppSession } from "@/features/auth/session/get-app-session.srv"
// import { redirect } from "next/dist/server/api-utils"
import { API_SIGN_IN_ROUTE } from "@/shared/config"
import { getPathname } from "@/shared/lib/get-pathname.srv"

export const metadata: Metadata = {
  title: "Settings",
}

export default async function SettingsPage() {
  const func__ = "SettingsPage"

  const pathname = await getPathname()
  const { user } = await sessionGuard(pathname || undefined)

  console.log(func__, { user })

  // if (!session?.user) redirect(API_SIGN_IN_ROUTE)

  // const session = sessionGuard("/settings")
  // TODO: Protect this page via authentication

  return <UserSettings user={user} />
}
