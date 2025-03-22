import { db } from "@/entities"

export const createProject = async (
  wspId: string,
  name: string,
  image?: string,
) => (
  db.project.create({
    data: {
      wspId,
      name,
      image,
    }
  })
)
