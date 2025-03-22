"use server"

import {
  FormActionState,
  FormActionWrapper,
} from "./defs"

export const formActionWrapper: FormActionWrapper = async (
  prevState, formData, zSch, nextAction,
) => {
  const { defaultValues, pathname } = prevState

  if (!defaultValues) return {
    formError: "State is undefined"
  }

  const state: FormActionState = {
    defaultValues,
  }
  state.values = {}
  for (const [k, v] of Object.entries(defaultValues)) {
    state.values[k] = formData.get(k) || v
  }

  const parse = zSch.safeParse(state.values)
  if (!parse.success) {
    state.fieldErrors = parse.error.flatten().fieldErrors
    return state
  }

  return nextAction ?
    nextAction(prevState, state) :
    state
}
