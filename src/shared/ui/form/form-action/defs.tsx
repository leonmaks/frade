import {
  // ActionError,
  ActionState,
  // ActionSuccess,
  error,
  success
} from "@/shared/action"
// import { UseFormReturn } from "react-hook-form"
// import { ZodSchema } from "zod"

export type FormValues = Record<string, any | undefined>
export type FieldErrors = Record<string, string[] | undefined>

// export type FormInitialState = FormValues | undefined
// {
//   values: FormValues
//   pathname?: string
// }

// export type FormSuccess = ActionSuccess
// export type FormError = ActionError & {
// }

export type FormActionState = ActionState & {
  fieldErrors?: FieldErrors
}

export type FormAction = (
  prevState: FormValues | undefined | unknown,
  formData: FormData,
) => Promise<FormActionState>

export const formSuccess = (
  message?: string,
  data?: FormValues
): FormActionState => (
  success(message)
)

export const formError = (
  formError: string,
  fieldErrors?: FieldErrors,
): FormActionState => ({
  ...error(formError),
  fieldErrors: fieldErrors || undefined,
})

// export const formFieldErrors = (
//   formError: string,
//   fieldErrors: FieldErrors,
// ): FormFieldErrors => ({
//   ...error(formError),
//   fieldErrors,
// })

// export type FormActionState = {
//   values?: Record<string, any | undefined>
//   fieldErrors?: Record<string, string[] | undefined>
//   // fieldErrors?: { [key: keyof T]: string[] | undefined }
//   formError?: string
//   success?: boolean
//   pathname?: string
// }

// export type FormActionWrapper = (
//   prevState: FormActionState,
//   formData: FormData,
//   zSch: ZodSchema,
//   nextAction?: FormAction,
// ) => Promise<FormActionState>

// export type HandleActionErrors = (
//   state: FormActionState,
//   form: UseFormReturn,
//   toastError?: (e: string) => void
// ) => void
