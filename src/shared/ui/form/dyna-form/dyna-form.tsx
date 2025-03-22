"use client"

import {
  ReactNode,
  useActionState,
  useEffect,
  // useRef
} from "react"
// import { usePathname } from "next/navigation"
import { toast } from "sonner"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Label } from "@/shared/shadcn-ui/label"
import { Button } from "@/shared/shadcn-ui/button"
import { Form, FormMessage } from "@/shared/shadcn-ui/form"
// import { FormSubmitButton } from "@/shared"

import {
  DynaFormFieldDef,
  // DynaFormMode,
} from "./defs"

import { dynaFormDefaultValues } from "./dyna-form-default-values"
import { dynaFormZSchema } from "./dyna-form-z-schema"
import { DynaFormField } from "./dyna-form-field"
import { SubmitButton } from "../../button"
import { FormActionState, FormValues } from ".."
import { AlertMessage, toastMessage } from "../../alert"

// type DynaFormState = "new" | "valid" | "invalid"

interface DynaFormProps {
  // title: string
  // subtitle?: string
  fields: DynaFormFieldDef[]
  // fieldValues: string
  // mode: DynaFormMode
  formAction: (
    prevState: FormValues | undefined,
    formData: FormData
  ) => Promise<FormActionState>
  submit?: ReactNode | string
}

export const DynaForm = ({
  // title,
  // subtitle,
  fields,
  // fieldValues,
  // mode,
  formAction,
  submit,
}: DynaFormProps) => {
  const func__ = "DynaForm"
  // const pathname = usePathname()

  console.log(func__, { fields })

  const defaultValues = dynaFormDefaultValues(
    fields,
    {},
    // JSON.parse(fieldValues),
  )

  const initialState = {
    // errors: Object.fromEntries(
    //   fields.map(({ name }) => {
    //     return [name, undefined]
    //   })
    // ),
    values: defaultValues,
    // pathname,
  }

  console.log(func__, { defaultValues })

  const schema = dynaFormZSchema(fields)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const [
    state,
    action,
    isPending
  ] = useActionState(formAction, undefined)

  console.log(func__, "actionState", { state })

  useEffect(() => {
    //   // console.log(func__, "useEffect")

    //   form.reset()

    //   if (state?.values) {
    //     for (const [f, v] of Object.entries(state.values)) {
    //       form.setValue(f, v)
    //     }
    //   }

    toastMessage(state)

  }, [state])

  // const { setError } = form

  // const formRef = useRef<HTMLFormElement>(null)

  const { isSubmitting, isValid, isDirty } = form.formState

  console.log(func__, "submitState", { isSubmitting, isValid, isDirty })

  return <>

    {/* <div className="mb-4">
      <h1 className="text-2xl">{title}</h1>
      {subtitle && (<span className="items-start px-1 mt-2 text-xs bg-slate-100">{subtitle}</span>)}
    </div> */}

    {/* <div className="flex items-center justify-end gap-2">
      <Label className="p-1 bg-zinc-100">
        Mode: {mode || "Undefined"}
      </Label>
    </div> */}

    <Form {...form}>
      <form
        action={action}
        // onSubmit={form.handleSubmit(v => console.log(func__, { v }))}
        className="space-y-2"
      >

        {fields.map(f => (
          <DynaFormField
            key={f.name}
            control={form.control}
            label={f.label}
            name={f.name}
            fieldTypeId={f.fieldTypeId}
            editable={f.isEditable === false ? false : true}
            state={state}
            isPending={isPending}
          />
        ))}

        <AlertMessage state={state} />

        <SubmitButton
          disabled={isSubmitting || !isValid || isPending}
        >
          {submit ? submit : "Submit"}
        </SubmitButton>

        {/* <div className="">
          <Button
            disabled={isSubmitting || !isValid || !isDirty}
            type="submit"
            className="capitalize"
          >
            Xxx
          </Button>
        </div> */}

        {/* <FormSubmitButton mode={mode} /> */}
      </form>
    </Form >
  </>
}
