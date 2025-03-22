"use server"

import { registerSchema } from "../schema"
import { createUser, findUserWithEmail } from "@/entities"
import {
  formError,
  // formSuccess
} from "@/shared/ui/form"
// import { sleep } from "@/shared/utils"
import { passwordHash } from "../password"
import { loginAction } from "./login-action"

export const registerAction = async (
  _prevState: unknown,
  data: FormData,
) => {
  // const func__ = "registerAction"

  const formData = Object.fromEntries(data)

  // console.log(func__, { prevState, formData })
  // await sleep(3000)
  //
  const validatedFields = registerSchema.safeParse(formData)

  // console.log(func__, { formData, parse: JSON.stringify(parse, null, 2) })

  if (!validatedFields.success) {
    return formError("Invalid credentials", validatedFields.error.flatten().fieldErrors)
  }

  const { name, email, password } = validatedFields.data

  const userWithEmail = await findUserWithEmail(email)
  if (userWithEmail) {
    return formError("Email already in use")
  }

  const { hash, salt } = await passwordHash(password)

  // const user = 
  await createUser({
    name,
    email,
    password: hash,
    salt,
  })

  // return formSuccess("User created successfully", user)
  return loginAction(_prevState, data)
}
