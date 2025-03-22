import { Prisma } from "@prisma/client"

import { db } from "../db"

export const findUser = async (
  where: Prisma.UserWhereInput
) => (
  db.user.findMany({ where })
)
