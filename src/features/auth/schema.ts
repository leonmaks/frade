import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().trim().min(3)
})

export type LoginSchemaType = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  name: z.string().trim().min(3),
  email: z.string().email(),
  password: z.string().trim().min(3)
})

export type RegisterSchemaType = z.infer<typeof registerSchema>
