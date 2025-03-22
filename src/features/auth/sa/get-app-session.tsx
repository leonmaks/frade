"use server"
import { auth } from ".."

export const getAppSession = async () => auth()
