import { db } from "@/entities"

export const findWsps = async (
  userId: string,
) => (
  db.wsp.findMany({
    where: {
      userId,
    }
  })
)
