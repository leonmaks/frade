import { z, ZodSchema } from "zod"

export const
  DynaFormFieldText = "01.01",
  DynaFormFieldPassword = "01.02",
  DynaFormFieldTextArea = "02",
  DynaFormFieldLov = "03",

  DynaFormOrdLast = "Z.99"

export const DynaFormFieldZType: Record<string, ZodSchema> = {
  "01.01": z.string().trim(),
  "01.02": z.string().trim(),
  "02": z.string().trim(),
  "03": z.string().trim(),
}

export type DynaFormMode = "create" | "update"

// export type DynaFormState = {
//   errors?: Record<string, string[] | undefined>
//   message?: string
//   defaultValues?: Record<string, any>
//   values?: Record<string, any>
//   pathname?: string
// }

// export type DynaFormAction = (
//   prevState: DynaFormState,
//   formData: FormData
// ) => DynaFormState | Promise<DynaFormState>

export type DynaFormFieldDef = {
  // id: string
  fieldTypeId: string
  label?: string
  name: string
  // isUK?: boolean | null
  isNotNull?: boolean | null
  isEditable?: boolean | null
  isProp?: boolean | null
  // ord: string
}

// export type DynaFormFieldDef = {
//   name: string
//   zType: ZodSchema
//   editable?: boolean
//   mandatory?: boolean
// }

// export const DynaFormSchema = (
//   fields: DynaFormFieldDef[]
// ) => z.object(Object.fromEntries(fields.map(
//   ({ name, zType }) => [name, zType])
// ))
