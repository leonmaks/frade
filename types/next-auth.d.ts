import { DefaultSession } from "next-auth"

import { UserRole } from "@prisma/client"

declare module "next-auth" {

  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */

  interface Session {
    user: User & DefaultSession["user"]
    // {
    //   /** The user's postal address. */
    //   // address: string
    //   id: string
    //   role: UserRole
    //   // email: string
    //   /**
    //    * By default, TypeScript merges new interface properties and overwrites existing ones.
    //    * In this case, the default session user properties will be overwritten,
    //    * with the new ones defined above. To keep the default session user properties,
    //    * you need to add them back into the newly declared interface.
    //    */
    // } & DefaultSession["user"]
  }

  interface User {
    role: UserRole
  }
}
