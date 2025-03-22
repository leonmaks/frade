import { db } from "@/entities"

export const newRepoItem = async () => (
  await db.repoItem.create({
    data: {
      id: undefined
    }
  })
)
