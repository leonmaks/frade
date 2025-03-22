export const
  AUTH_BASE_PATH = "/api/auth",

  /**
   * Routes accessible to public.
   * Auth not required.
   */
  PUBLIC_ROUTES = [
    "/",
    "/public",
    // TODO: Delete below routes from public:
    "/users",
  ],

  /**
   * The redirect path after logging in.
   */
  LOGIN_REDIRECT = "/",

  /**
   * Auth routes.
   * If logged in - redirect to LOGIN_REDIRECT.
   */
  AUTH_PFXS = [
    "/auth"
  ],

  // API_SIGN_IN_ROUTE = "/auth/sign-in",
  API_SIGN_IN_ROUTE = "/api/auth/signin",

  SIGN_IN_ROUTE = "/auth/sign-in",
  NEW_USER_ROUTE = "/auth/new-user",
  VERIFY_REQUEST_ROUTE = "/auth/verify-request",

  /**
   * Auth API prefix.
   */
  API_AUTH_PFXS = [
    AUTH_BASE_PATH
  ]
