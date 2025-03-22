import { toast } from "sonner"

import { ActionMessage } from "./defs"

export const toastActionMessages = (
  messages?: ActionMessage[]
) => {
  if (messages?.length) {
    messages.forEach(({ message, type }) => {
      type === "success" ?
        toast.success(message) :
        toast.error(message)
    })
  }
}
