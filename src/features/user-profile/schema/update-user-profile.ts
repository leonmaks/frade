import { z } from "zod"

export const updateUserProfileSchema = z.object({
  name: z.string().trim().min(1, "Cannot be empty"),
})

export type UpdateUserProfileValues = z.infer<typeof updateUserProfileSchema>
