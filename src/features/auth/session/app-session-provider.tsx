import { SessionProvider } from "next-auth/react"

export const AppSessionProvider = ({
  children,
}: {
  children?: React.ReactNode
}) => (
  <SessionProvider>
    {children}
  </SessionProvider>
)
