import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { cn } from "@/shared/lib/shadcn-ui-utils"
import { Toaster } from "@/shared/shadcn-ui/sonner"

// import { AppProviders } from "./_app/app-providers"

import "./globals.css"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

export const metadata: Metadata = {
  title: {
    template: "%s | FRADE",
    absolute: "FRADE"
  },
  description: "Flexible Repository for Architecture Design and Execution",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (
    <html lang="en"
    // suppressHydrationWarning
    >
      <body className={cn(
        "min-h-screen bg-background antialiased",
        inter.className
      )}>
        {/* <AppProviders> */}
        {children}
        {/* </AppProviders> */}
        <Toaster
          position="top-right"
          richColors
        />
      </body>
    </html>
  )
}
