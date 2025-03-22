import {
  Control,
  FieldPath,
  FieldValues
} from "react-hook-form"

import { Input } from "@/shared/shadcn-ui/input"
import {
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/shadcn-ui/form"

import {
  DynaFormFieldLov,
  DynaFormFieldPassword,
  DynaFormFieldText
} from "./defs"
import { FormActionState } from "../form-action"

export const DynaFormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  label,
  name,
  fieldTypeId = DynaFormFieldText,
  editable = true,
  state,
  isPending = false
}: {
  control: Control<TFieldValues, any>,
  label?: string
  name: TName,
  fieldTypeId?: string
  editable?: boolean,
  state?: FormActionState,
  isPending?: boolean,
}) => {

  let fieldError = (
    state?.fieldErrors && state?.fieldErrors[name]
  ) ? state.fieldErrors[name] : undefined

  return <>
    <FormField<TFieldValues, TName>
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {/* <FormItem className="flex flex-col"> */}

          {label && (
            <FormLabel>{label}</FormLabel>
          )}

          {fieldTypeId === DynaFormFieldLov ? (

            <div>Unknown</div>

          ) : (

            <FormControl>
              {(
                fieldTypeId === DynaFormFieldText ||
                fieldTypeId === DynaFormFieldPassword
              ) ? (
                <Input
                  {...field}
                  disabled={!editable || isPending}
                  placeholder={field.name}
                  type={
                    fieldTypeId === DynaFormFieldPassword ?
                      "password" :
                      "text"
                  }
                />

              ) : (
                <div>Unknown</div>
              )}
            </FormControl>
          )}

          {fieldError && fieldError.length && (
            <FormMessage>
              {fieldError}
            </FormMessage>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  </>
}
