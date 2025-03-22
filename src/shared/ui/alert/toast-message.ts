import { toast } from "sonner"

import { ActionState } from "@/shared/action"

export const toastMessage = (
  state?: ActionState
) => {
  if (state) {
    if (state.type === "success" && state.message) {
      toast.success(state.message)
    } else if ((state.type === "error" || state.type === "warning") && state.error) {
      toast.error(state.error)
    }
  }
}
