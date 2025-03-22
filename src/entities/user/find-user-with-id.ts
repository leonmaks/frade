import { db } from "../db"

export const findUserWithId = async (
  id: string
) => (
  db.user.findUnique({ where: { id } })
)
