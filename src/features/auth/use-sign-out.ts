import { useMutation } from "@tanstack/react-query"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

import { SIGN_IN_ROUTE } from "@/shared/config"

export function useSignOut() {
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: () => signOut({ callbackUrl: "/" }),
    onSuccess: async () => {
      router.push(SIGN_IN_ROUTE)
    },
  })

  return {
    signOut: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
