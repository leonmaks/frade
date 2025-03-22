import { redirect } from "next/navigation"

import { LOGIN_REDIRECT } from "@/shared/config"
import { MainLayout } from "@/shared/ui/main-layout"

import { auth } from "@/features/auth"

export default async function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  const func__ = "AuthLayout"

  const session = await auth()
  if (session) redirect(LOGIN_REDIRECT)

  console.log(func__, "session=", session)

  return (
    <MainLayout
      authButton={null}
    >
      <div className="h-full flex items-center justify-center">
        {/* <div className="container py-6"> */}
        {/* <div className="overflow-hidden rounded-[0.5rem] border bg-background shadow"> */}
        {/* <div className="flex flex-col items-center justify-center md:pt-8"> */}
        {/* <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"> */}
        {children}
        {/* </div> */}
        {/* </div> */}
        {/* </div> */}
      </div>
    </MainLayout>
  )
}
