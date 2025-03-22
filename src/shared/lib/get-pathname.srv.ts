import { headers } from "next/headers"

import { X_CURRENT_PATH_HEADER } from "../config/headers"

export const getPathname = async () => (
  (await headers()).get(X_CURRENT_PATH_HEADER)
)
