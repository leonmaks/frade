import { redirect } from "next/navigation"

import { API_SIGN_IN_ROUTE } from "@/shared/config"

import { getAppSession } from "./get-app-session.srv"

export const sessionGuard = async (
  callbackUrl?: string,
) => {
  const session = await getAppSession()

  if (!session?.user) redirect(callbackUrl ?
    `${API_SIGN_IN_ROUTE}?callbackUrl=${callbackUrl}` :
    API_SIGN_IN_ROUTE
  )

  return session
}
