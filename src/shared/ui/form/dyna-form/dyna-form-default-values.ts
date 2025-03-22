import { DynaFormFieldDef } from "./defs"

export const dynaFormDefaultValues = (
  fields: DynaFormFieldDef[],
  fieldValues: Record<string, any>,
) => {
  const func__ = "dynaFormDefaultValues"

  return Object.fromEntries(
    fields.map(({ name }) => {

      console.log(func__, "field", { name, value: fieldValues[name] })

      return [name, fieldValues[name] || ""]
    })
  )
}
