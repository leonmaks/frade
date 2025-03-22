import { db } from "@/entities"
import { AuthButton } from "@/features/auth/ui/auth-button"
import Link from "next/link"

export default async function UsersPage() {
  const func__ = "UsersPage"
  const users = await db.user.findMany()

  console.log(func__, { users })

  return (
    <main className="flex flex-col items-center gap-6 py-10">
      <AuthButton />
      <h1 className="text-center text-4xl font-bold">Next-Auth V5 Tutorial</h1>
      <h2 className="text-center text-2xl font-semibold">Users</h2>
      <ul className="list-inside list-disc">
        {users.map(user => (
          <li key={user.id}>
            <Link href={`/user/${user.id}`} className="hover:underline">
              {user.name || `User ${user.id}`}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
