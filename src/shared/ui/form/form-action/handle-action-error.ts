import { HandleActionErrors } from "./defs"

export const handleActionErrors: HandleActionErrors = (
  state, form, toastError,
) => {

  if (state?.values) {
    for (const [f, v] of Object.entries(state.values)) {
      form.setValue(f, v)
    }
  }

  if (state?.fieldErrors) {
    for (const [f, errs] of Object.entries(state.fieldErrors)) {
      errs?.forEach(message => {
        form.setError(f, { message })
        toastError && toastError(`${f}: ${message}`)
      })
    }
  }

}
