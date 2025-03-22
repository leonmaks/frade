"use client"

import { useFormStatus } from "react-dom"

import { Button } from "@/shared/shadcn-ui/button"

export const FormSubmitButton = ({
  mode = "submit"
}: {
  mode?: string
}) => {

  const { pending } = useFormStatus()

  return <>
    <Button
      type="submit"
      disabled={pending}
    // onClick={() => { setError("name", { message: "someError" }) }}
    >
      {mode === "create" ? "Create" : "Submit"}
    </Button>
  </>
}
