import { db } from "@/entities"

export const findWspsByMember = async (
  userId: string,
) => (
  db.wspMember.findMany({
    where: { userId },
    include: {
      wsp: {
        select: {
          id: true,
          name: true,
          image: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        }
      }
    },
    orderBy: {
      wsp: {
        createdAt: "desc",
      }
    },
  })
)
