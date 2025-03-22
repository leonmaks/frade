import { db } from "@/entities"

export const findProjectsByWsp = async (
  wspId: string,
) => (
  db.project.findMany({
    where: { wspId },
    orderBy: {
      wsp: {
        createdAt: "desc",
      }
    },
  })
)
