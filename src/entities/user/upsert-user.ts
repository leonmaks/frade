import { Prisma } from "@prisma/client"

import { db } from "../db"

export const upsertUser = async (
  user: Prisma.UserCreateInput
) => (
  db.user.upsert({
    where: {
      id: user.id,
    },
    create: user,
    update: user,
  })
)
