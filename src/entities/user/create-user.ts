import { Prisma } from "@prisma/client"
import { db } from "../db"

export const createUser = async (
  data: Prisma.UserCreateInput,
) => (
  db.user.create({ data })
)
