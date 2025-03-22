import {
  type NextRequest,
  NextResponse
} from "next/server"

import { X_CURRENT_PATH_HEADER } from "./shared/config/headers"

export const config = {
  matcher: [
    // match all routes except static files and APIs
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}

export function middleware(request: NextRequest) {
  // Add a new header x-current-path which passes the path to downstream components
  const headers = new Headers(request.headers)
  headers.set(X_CURRENT_PATH_HEADER, request.nextUrl.pathname)
  return NextResponse.next({ headers })
}



// import NextAuth from "next-auth"

// import {
//   AUTH_PFXS,
//   API_AUTH_PFXS,
//   LOGIN_REDIRECT,
//   PUBLIC_ROUTES,
//   API_SIGN_IN_ROUTE,
// } from "@/shared/config"

// import { matchPrefixes } from "@/shared/lib/text-utils"

// import authConfig from "@/features/auth/auth.config"

// const { auth } = NextAuth(authConfig)

// export default auth((req) => {
// const func__ = "middleware.auth"

// const isLoggedIn = !!req.auth
// const { nextUrl } = req
// const { pathname } = nextUrl

// console.log(func__, {
//   pathname,
//   isLoggedIn,
//   // req
// })

// // Check 'pathname' is API_AUTH_ROUTE
// //
// const isApiAuthRoute = matchPrefixes(pathname, API_AUTH_PFXS)
// if (isApiAuthRoute) {
//   return
// }

// // Check 'pathname' is AUTH_ROUTE
// //
// const isAuthRoute = matchPrefixes(pathname, AUTH_PFXS)
// if (isAuthRoute) {
//   if (isLoggedIn) {
//     return Response.redirect(new URL(LOGIN_REDIRECT, nextUrl))
//   }
//   return
// }

// // If 'pathname' is not PUBLIC route - redirect to SIGN_IN page
// //
// const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
// if (!isLoggedIn && !isPublicRoute) {
//   return Response.redirect(new URL(API_SIGN_IN_ROUTE, nextUrl))
// }
// })

// Don't invoke Middleware on some paths
// export const config = {
//   // matcher: "/settings",

//   // matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],

//   matcher: [
//     // Skip Next.js internals and all static files, unless found in search params
//     '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
//     // Always run for API routes
//     '/(api|trpc)(.*)',
//   ],
// }



// How to get the current pathname in the app directory of Next.js?
// https://stackoverflow.com/a/74588571/1017684
// export function middleware(request: NextRequest) {
//   const func__ = "middleware"
//   console.log(func__, "lol!!!")

//   const requestHeaders = new Headers(request.headers)
//   requestHeaders.set(
//     "x-pathname",
//     request.nextUrl.pathname
//   )

//   return NextResponse.next({
//     request: {
//       headers: requestHeaders,
//     },
//   })
// }
