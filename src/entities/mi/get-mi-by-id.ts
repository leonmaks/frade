import { db } from "@/entities"

export const getMiById = (id: string) => (
  db.metaItem.findUnique({ where: { id } })
)
