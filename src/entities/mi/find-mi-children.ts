import { db } from "@/entities"

export const findMiChildren = (miId1: string) => (
  db.miLink.findMany({
    where: { miId1 },
    include: {
      mi2: {
        select: {
          id: true,
          miTypeId: true,
          name: true,
          description: true,
        }
      }
    }
  })
)
