// source: [bug]: Theme Provider creates hydration error in Next.js 15.0.1 #5552
// link: https://github.com/shadcn-ui/ui/issues/5552#issuecomment-2714796447

// "use client"

// import { useEffect, useState } from "react"
// import dynamic from "next/dynamic"
// import { type ThemeProviderProps } from "next-themes"

// const NextThemesProvider = dynamic(
//   () => import("next-themes").then((e) => e.ThemeProvider), { ssr: false, }
// )

// export const ThemeProvider = ({
//   children,
//   ...props
// }: ThemeProviderProps) => {

//   const func__ = "ThemeProvider"
//   const [isLoaded, setIsLoaded] = useState(false)

//   useEffect(() => {
//     setIsLoaded(true)

//     console.log(func__, { NextThemesProvider, props })

//   }, [])

//   if (!isLoaded) {
//     return null
//   }

//   return <NextThemesProvider {...props}>
//     {children}
//   </NextThemesProvider>
// }

"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children }: { children?: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
