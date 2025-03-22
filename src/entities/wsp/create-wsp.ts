import { db } from "@/entities"

export const createWsp = async (
  userId: string,
  name: string,
  inviteCode: string,
  image?: string,
  description?: string,
) => (
  db.wsp.create({
    data: {
      userId,
      name,
      inviteCode,
      image,
      description,
    }
  })
)
