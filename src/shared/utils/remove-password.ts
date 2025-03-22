export const removePassword = <
  T extends { password: string }
>({
  password: _,
  ...rest
}: T): Omit<T, "password"> => (
  rest
)
