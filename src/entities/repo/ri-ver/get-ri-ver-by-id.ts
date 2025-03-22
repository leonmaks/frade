import { db } from "@/entities"

export const getRiVerById = (id: string) => (
  db.riVer.findUnique({ where: { id } })
)
