"use server"

import { signOut as naSignOut } from "../auth"

export const signOut = async () => { await naSignOut() }
