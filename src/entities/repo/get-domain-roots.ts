import { Prisma } from '@prisma/client'

import { db } from "@/entities"

import { MiLinkTypeDef } from '../meta'

export const getDomainRoots = async (
  d: string | string[]
) => {
  const func__ = "getDomainRoots"

  const domains = typeof d === "string" ? [d] : d

  console.log(func__, { domains })

  const rootIds: { ri_id: string }[] = await db.$queryRaw`
    SELECT rv_0.ri_id
      FROM meta_items mi_d
      JOIN mi_links ml_r ON ml_r.mi_id1 = mi_d.id
      JOIN ri_vers rv_0 ON rv_0.mi_id = ml_r.mi_id2
     WHERE ml_r.mi_link_type_id = ${MiLinkTypeDef.IsRoot.id}
       AND mi_d.id in (${Prisma.join(domains)})`

  console.log(func__, { rootIds })

  return rootIds
}
