import { db } from "@/entities"

export const getMiAttrsById = async (miId: string) => (
  db.miAttr.findMany({ where: { miId } })
)
