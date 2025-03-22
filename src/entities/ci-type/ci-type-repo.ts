import { cache } from "react"

import { db } from "@/entities"
import { E_CiTypeId, T_CiType } from "./types"

class CiTypeRepo {

  getById = cache((id: E_CiTypeId) => (
    db.ciType.findFirst({ where: { id } }))
  )

  getAll = cache(() => db.ciType.findMany())

  create = (data: T_CiType) => db.ciType.create({ data })
}

export const ciTypeRepo = new CiTypeRepo()
export default ciTypeRepo
