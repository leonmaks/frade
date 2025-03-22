import { ReactNode } from "react"

import { Button } from "@/shared/shadcn-ui/button"

type SubmitButtonProps = {
  disabled?: boolean
  children: ReactNode
}

export const SubmitButton = ({
  disabled,
  children,
}: SubmitButtonProps) => (
  <Button
    disabled={disabled}
    type="submit"
    className="w-full"
  >
    {children}
  </Button>
)
