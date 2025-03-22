import { RiVer } from "@prisma/client"
import { db } from "@/entities"

export const updateRiVer = ({
  id,
  name,
  description,
  fd,
  td,
}: Partial<RiVer>) => (

  db.riVer.update({
    where: { id },
    data: {
      name,
      description,
      // fd,
      // td,
    }
  })
)
