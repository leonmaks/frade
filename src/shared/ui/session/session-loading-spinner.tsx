"use client"

import { ReactNode } from "react"
import { useSession } from "next-auth/react"
import { Spinner } from "../spinner"

type SessionLoadingSpinnerProps = {
  children: ReactNode
}

export const SessionLoadingSpinner = ({
  children
}: SessionLoadingSpinnerProps
) => {
  const { status } = useSession()

  if (status === "loading") {
    return <Spinner />
  }

  return <>
    {children}
  </>
}
