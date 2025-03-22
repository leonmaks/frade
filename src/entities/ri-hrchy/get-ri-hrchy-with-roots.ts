import { Prisma } from '@prisma/client'

import { db } from "@/entities"

import { RiHrchyNode } from './defs'

export const getRiHrchyWithRoots = async (
  r: string | string[]
) => {
  const func__ = "getRiHrchyWithRoots"

  const roots = typeof r === "string" ? [r] : r

  console.log(func__, { roots })

  const riHierarchy: RiHrchyNode[] = await db.$queryRaw`
    WITH RECURSIVE roh AS (
      SELECT rv_r.id, rv_r.ri_id, null ri_up_id, rv_r.mi_id, rv_r.name, rv_r.description, rv_r.fd, rv_r.td, 0 AS hierarchy__lvl
        FROM ri_vers rv_r
       WHERE rv_r.ri_id IN (${Prisma.join(roots)})
       UNION
      SELECT rv_chld.id, rv_chld.ri_id, rl_chld.ri_id1, rv_chld.mi_id, rv_chld.name, rv_chld.description, rv_chld.fd, rv_chld.td, roh.hierarchy__lvl+1
        FROM ri_links AS rl_chld
        JOIN roh ON roh.ri_id = rl_chld.ri_id1
        JOIN ri_vers rv_chld ON rv_chld.ri_id = rl_chld.ri_id2
    ) SELECT * FROM roh`

  console.log(func__, { riHierarchy })

  return riHierarchy
}
