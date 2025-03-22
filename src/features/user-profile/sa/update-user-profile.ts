"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/entities"

import { auth } from "@/features/auth"
import {
  updateUserProfileSchema,
  UpdateUserProfileValues
} from "@/features/user-profile"

// To learn more about server actions, watch my YT tutorial: https://www.youtube.com/watch?v=XD5FpbVpWzk

export async function updateUserProfile(values: UpdateUserProfileValues) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    throw Error("Unauthorized")
  }

  const { name } = updateUserProfileSchema.parse(values)

  await db.user.update({
    where: {
      id: userId
    },
    data: {
      name
    }
  })

  revalidatePath("/")
}
