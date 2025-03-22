"use server"

import { signIn as signInAuth } from "../auth"

export const signIn = async () => await signInAuth()
