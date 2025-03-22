// "use client"

import { useAppSession } from "./session/use-app-session"

export const useRole = () => {
  const session = useAppSession()
  return session?.data?.user?.role
}
