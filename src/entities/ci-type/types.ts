import { CiType } from "@prisma/client"

export const enum E_CiTypeId {
  OrgUnit = 1,
  Sys = 30,
  Subsys = 31,
  IFlow = 40,
  SysInt = 50,
  TechInt = 60,
}

export type T_CiType = {
  id: E_CiTypeId
  name: CiType["name"]
  description?: CiType["description"]
  ord?: CiType["ord"]
  nick?: CiType["nick"]
}
