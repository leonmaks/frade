import { z, ZodString } from "zod"

import {
  DynaFormFieldDef,
  DynaFormFieldZType,
  DynaFormFieldLov,
  DynaFormFieldText,
  DynaFormFieldTextArea,
} from "./defs"

const fieldZSchema = ({
  fieldTypeId,
  isNotNull,
  isProp,
}: DynaFormFieldDef) => {

  let zSchema = DynaFormFieldZType[fieldTypeId]

  if (!isNotNull || isProp)
    zSchema = zSchema.optional()

  else if (
    fieldTypeId === DynaFormFieldText
    || fieldTypeId === DynaFormFieldTextArea
    || fieldTypeId === DynaFormFieldLov
  )
    zSchema = (zSchema as ZodString).min(1, "Must not be empty")

  return zSchema
}

export const dynaFormZSchema = (
  fields: DynaFormFieldDef[]
) => (
  z.object(Object.fromEntries(fields.map(
    f => [f.name, fieldZSchema(f)]
  )))
)
