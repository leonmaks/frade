import NextAuth, { User } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"

import { UserRole } from "@prisma/client"


import { db } from "@/entities/db"
import { findUserWithEmail } from "@/entities"

import authConfig from "@/features/auth/auth.config"

import { loginSchema } from "./schema"
import { passwordCompare } from "./password"

const { providers, ...others } = authConfig

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({

  providers: [

    Credentials({
      async authorize(credentials) {

        const validatedFields = loginSchema.safeParse(credentials)

        if (validatedFields.success) {
          const { email, password } = validatedFields.data

          const user = await findUserWithEmail(email)
          if (user?.password && user?.salt &&
            await passwordCompare(password, user.password, user.salt)) {

            return user as User
          }
        }
        return null
      }
    }),

    // Credentials({
    //   name: "Credentials",
    //   credentials: {
    //     username: { label: "Username", type: "text", placeholder: "jsmith" },
    //     password: { label: "Password", type: "password" },
    //   },

    //   async authorize(credentials): Promise<User | null> {
    //     const users = [
    //       { id: "u1", userName: "u1", name: "User 1", password: "u__", email: "u1@donotreply.com" },
    //       { id: "u2", userName: "u2", name: "User 2", password: "u__", email: "u2@donotreply.com" },
    //     ]

    //     const user = users.find(
    //       user => (
    //         user.userName === credentials.username &&
    //         user.password === credentials.password
    //       )
    //     )
    //     return user ? { id: user.id, name: user.name, email: user.email } : null
    //   }
    // }),
    ...providers,
  ],
  callbacks: {
    async session({ session }) {
      // const func__ = "auth.session"

      // console.log(func__, {
      //   session,
      //   userExists: !!session.user,
      //   userEmailExists: !!session.user.email
      // })

      if (
        (!session.user.id || !session.user.role) &&
        session.user?.email
      ) {
        const existingUser = await findUserWithEmail(session.user.email)

        // console.log(func__, { existingUser })

        if (existingUser) {
          session.user.id = existingUser.id
          session.user.role = existingUser.role
        } else {
          // TODO: If NO SUCH user in DB: decide & implement!
        }
      }
      // console.log(func__, { token, session, user })
      return session
    },
    // async jwt({ token }) {
    //   const func__ = "jwt"
    //   if (token.email) {
    //     const existingUser = await findUserWithEmail(token.email)
    //     if (existingUser) {
    //       token.id =
    //         token.role = existingUser.role
    //     }
    //   }
    //   console.log(func__, { token })
    //   return token
    // },
  },
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...others,
})
