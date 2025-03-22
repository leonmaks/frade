import { WspMemberRole } from "@prisma/client"

import { db } from "@/entities"

export const createWspMember = async (
  wspId: string,
  userId: string,
  role?: WspMemberRole,
) => (
  db.wspMember.create({
    data: {
      wspId,
      userId,
      role,
    }
  })
)
