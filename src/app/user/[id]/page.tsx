import { cache } from "react"
import Image from "next/image"
import { notFound } from "next/navigation"

import { db } from "@/entities"

interface PageProps {
  params: { id: string }
}

const getUser = cache(async (id: string) => {
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, image: true, createdAt: true },
  })
})

export async function generateStaticParams() {
  const allUsers = await db.user.findMany()

  return allUsers.map(({ id }) => ({ id }))
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const user = await getUser(id)

  return {
    title: user?.name || `User ${id}`,
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  // Artificial delay to showcase static caching
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const user = await getUser(id)

  if (!user) notFound()

  return (
    <div className="mx-3 my-10 flex flex-col items-center gap-3">
      {user.image && (
        <Image
          src={user.image}
          width={100}
          alt="User profile picture"
          height={100}
          className="rounded-full"
        />
      )}
      <h1 className="text-center text-xl font-bold">
        {user?.name || `User ${id}`}
      </h1>
      <p className="text-muted-foreground">
        User since {new Date(user.createdAt).toLocaleDateString()}
      </p>
    </div>
  )
}
