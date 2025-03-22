import { EMPTY_STRING } from "./defs"

export const
  REPO_ROOT = process.env.REPO_ROOT || "REPO_ROOT is undefined",

  NODE_ENV = process.env.NODE_ENV || "Undefined",

  NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "Undefined",

  GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || EMPTY_STRING,
  GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || EMPTY_STRING,

  GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || EMPTY_STRING,
  GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || EMPTY_STRING
