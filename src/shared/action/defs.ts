export type ActionSuccess = {
  type: "success"
  message?: string
}

export type ActionError = {
  type: "error"
  error: string
}

export type ActionWarning = {
  type: "warning"
  error: string
}

export type ActionState = (
  ActionSuccess | ActionError | ActionWarning
)

export type ActionResult<D> = ActionState & {
  data?: D
}

export const success = (
  message?: string,
): ActionSuccess => ({
  type: "success",
  message: message || undefined,
})

export const result = <D>(
  message?: string,
  data?: D
): ActionResult<D> => ({
  ...success(message),
  data: data || undefined
})

export const error = (
  error: string
): ActionError => ({
  type: "error", error
})

export const warning = (
  error: string
): ActionWarning => ({
  type: "warning", error
})
