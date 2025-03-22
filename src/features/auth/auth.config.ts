import { type NextAuthConfig } from "next-auth"
import { compact } from "lodash-es"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

import {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  NEXTAUTH_SECRET,
} from "@/shared/config"
import {
  AUTH_BASE_PATH,
  SIGN_IN_ROUTE,
  NEW_USER_ROUTE,
  VERIFY_REQUEST_ROUTE
} from "@/shared/config/auth-routes"

export default {
  // theme: {
  //   logo: "/icon.svg"
  // },

  basePath: AUTH_BASE_PATH,
  secret: NEXTAUTH_SECRET,
  pages: {
    signIn: SIGN_IN_ROUTE,
    newUser: NEW_USER_ROUTE,
    verifyRequest: VERIFY_REQUEST_ROUTE,
  },

  providers: compact([
    GITHUB_CLIENT_ID &&
    GITHUB_CLIENT_SECRET &&
    GitHub({
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
    }),

    GOOGLE_CLIENT_ID &&
    GOOGLE_CLIENT_SECRET &&
    Google({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ]),

} satisfies NextAuthConfig
