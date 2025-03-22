"use server"

import { redirect } from "next/navigation"
import { AuthError } from "next-auth"
// import { z } from "zod"

import { LOGIN_REDIRECT } from "@/shared/config"
import { sleep } from "@/shared/utils"
import {
  formError,
  // formSuccess
} from "@/shared/ui/form"

import { signIn } from "../auth"
import {
  loginSchema,
  // LoginSchemaType
} from "../schema"
// import { NextResponse } from "next/server"
// import { FormAction, FormActionState } from "@/shared/ui/form"

export const loginAction = async (
  _prevState: unknown,
  data: FormData,
) => {
  const func__ = "loginAction"

  const formData = Object.fromEntries(data)

  console.log(func__, { formData })
  await sleep(3000)
  //
  const validatedFields = loginSchema.safeParse(formData)

  // console.log(func__, { formData, validatedFields: JSON.stringify(validatedFields, null, 2) })

  if (!validatedFields.success) {
    return formError("Invalid credentials", validatedFields.error.flatten().fieldErrors)
  }

  const { email, password } = validatedFields.data

  try {
    await signIn("credentials", {
      email, password, redirect: false
    })
    // console.log(func__, { result })

  } catch (error) {

    // console.log(func__, { error })

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return formError("Invalid Credentials")
        default:
          return formError("Internal Server Error")
      }
    }

    console.error(error)

    return formError(error.message)
  }

  redirect(LOGIN_REDIRECT)

  // return formSuccess()
}
