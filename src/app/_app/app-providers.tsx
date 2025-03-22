// "use client"

import { QueryClientProvider } from "@tanstack/react-query"

import { ComposeChildren } from "@/shared/utils/react"
import { ThemeProvider } from "@/shared/theme"
import { queryClient } from "@/shared/api/query-client"

import { AppSessionProvider } from "@/features/auth/session"

export const AppProviders = ({
  children
}: {
  children: React.ReactNode
}) => (
  <ComposeChildren>
    {/* <ThemeProvider /> */}
    {/* <AppSessionProvider /> */}
    {/* <QueryClientProvider client={queryClient} /> */}
    {children}
  </ComposeChildren>
)
