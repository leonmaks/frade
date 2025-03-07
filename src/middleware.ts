import NextAuth from "next-auth"
import {
  NextRequest,
  NextResponse
} from "next/server"

import {
  API_AUTH_PFXS,
  AUTH_PFXS,
  LOGIN_REDIRECT,
  LOGIN_ROUTE,
  PUBLIC_ROUTES
} from "@/shared/config"

import { matchPrefixes } from "@/shared"

import authConfig from "@/features/auth/auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const func__ = "middleware.auth"
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  // console.log("ROUTE:", req.nextUrl.pathname)
  // console.log("IS LOGGED IN:", isLoggedIn)

  const isApiAuthRoute = matchPrefixes(nextUrl.pathname, API_AUTH_PFXS)
  if (isApiAuthRoute) {
    // console.log(func__, `${nextUrl.pathname}: API AUTH ROUTE`)
    return
  }

  // const isAuthRoute = matchPrefixes(nextUrl.pathname, AUTH_PFXS)
  // if (isAuthRoute) {
  //   // console.log(func__, `${nextUrl.pathname}: AUTH ROUTE`)
  //   if (isLoggedIn) {
  //     // console.log(func__, `Redirect to ${LOGIN_REDIRECT}`)
  //     return Response.redirect(new URL(LOGIN_REDIRECT, nextUrl))
  //   }
  //   return
  // }

  const isPublicRoute = PUBLIC_ROUTES.includes(nextUrl.pathname)
  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL(LOGIN_ROUTE, nextUrl))
  }
})

// Don't invoke Middleware on some paths
export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
  // matcher: [
  //   // Skip Next.js internals and all static files, unless found in search params
  //   '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  //   // Always run for API routes
  //   '/(api|trpc)(.*)',
  // ],
}

// How to get the current pathname in the app directory of Next.js?
// https://stackoverflow.com/a/74588571/1017684
export function middleware(request: NextRequest) {

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(
    "x-pathname",
    request.nextUrl.pathname
  )

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}
