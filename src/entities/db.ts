import { PrismaClient } from "@prisma/client"

import { NODE_ENV } from "@/shared/config"

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

const prismaClientSingleton = () => {
  return new PrismaClient({ log: ["query"], })
}

export const db = globalThis.prismaGlobal ?? prismaClientSingleton()

if (NODE_ENV !== "production") globalThis.prismaGlobal = db
