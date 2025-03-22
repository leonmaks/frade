"use client"

import { useRouter } from "next/navigation"

import { SIGN_IN_ROUTE } from "@/shared/config"

type SignInWrapperCliProps = {
  children: React.ReactNode
  mode?: "modal" | "redirect"
  asChild?: boolean
}

export const SignInWrapperCli = ({
  children,
  mode = "redirect",
  asChild,
}: SignInWrapperCliProps) => {
  const router = useRouter()

  const onClick = () => {
    router.push(SIGN_IN_ROUTE)
  }

  if (mode === "modal") {
    return (
      <span>
        TODO: Implement modal
      </span>
    )
  }

  return (
    <span
      onClick={onClick}
      className="cursor-pointer"
    >
      {children}
    </span>
  )
}
