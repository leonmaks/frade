import { Alert, AlertDescription } from "@/shared/shadcn-ui/alert"

import { ActionState } from "@/shared/action"

export const AlertMessage = ({
  state
}: {
  state?: ActionState
}) => {

  if (state?.type === "success" && state.message) {
    return (
      <Alert variant="default">
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    )
  }

  if ((state?.type === "error" || state?.type === "warning") && state.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.error}</AlertDescription >
      </Alert >
    )
  }

  return null
}
