import { Prisma } from '@prisma/client'

import { db } from "@/entities"

import { MiLinkTypeDef } from '../meta'
import { RiHrchyNode } from './defs'

export const getRiHrchyByDomain = async (
  d: string | string[]
) => {
  // const func__ = "getRiHrchyByDomain"

  const domains = typeof d === "string" ? [d] : d
  // console.log(func__, { domains })

  const riHierarchy: RiHrchyNode[] = await db.$queryRaw`
       WITH RECURSIVE roh AS (
      SELECT rv_0.id ri_ver_id, rv_0.ri_id, null ri_up_id, rv_0.mi_id, rv_0.name, rv_0.description, rv_0.fd, rv_0.td, 0 AS hierarchy__lvl
        FROM meta_items mi_d
        JOIN mi_links ml_r ON ml_r.mi_id1 = mi_d.id
        JOIN ri_vers rv_0 ON rv_0.mi_id = ml_r.mi_id2
       WHERE ml_r.mi_link_type_id = ${MiLinkTypeDef.IsRoot.id}
         AND mi_d.id in (${Prisma.join(domains)})
       UNION
      SELECT rv_chld.id, rv_chld.ri_id, rl_chld.ri_id1, rv_chld.mi_id, rv_chld.name, rv_chld.description, rv_chld.fd, rv_chld.td, roh.hierarchy__lvl+1
        FROM ri_links AS rl_chld
        JOIN roh ON roh.ri_id = rl_chld.ri_id1
        JOIN ri_vers rv_chld ON rv_chld.ri_id = rl_chld.ri_id2
    ) SELECT * FROM roh order by hierarchy__lvl`

  // console.log(func__, { riHierarchy })

  return riHierarchy
}
