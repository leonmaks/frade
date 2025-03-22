// import Image from "next/image"

import { getAppSession } from "@/features/auth/sa"

export default async function Home() {
  const session = await getAppSession()

  return (
    <div>
      {JSON.stringify(session, null, 2)}
    </div>
  )
}
