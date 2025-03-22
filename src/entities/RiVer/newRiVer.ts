import { db } from "@/entities"

export const newRiVer = async (
  riId: string,
  riTypeId: string,
  name: string,
  description?: string,
) => (
  await db.riVer.create({
    data: {
      id: undefined,
      riId,
      riTypeId,
      name,
      description,
    }
  })
)
