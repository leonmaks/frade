import { db } from "@/entities"

export const findWspById = async (
  id: string,
) => (
  db.wsp.findUnique({
    where: { id },
  })
)
