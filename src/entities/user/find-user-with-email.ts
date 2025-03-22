import { db } from "../db"

export const findUserWithEmail = async (
  email: string
) => (
  db.user.findUnique({ where: { email } })
)
