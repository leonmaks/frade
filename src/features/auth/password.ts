import { pbkdf2, randomBytes } from "node:crypto"

export const passwordHash = async (
  password: string,
  salt = randomBytes(16).toString("hex"),
) => {

  const hash = await new Promise<Buffer>((res, rej) =>
    pbkdf2(password, salt, 1000, 64, `sha512`,
      (error, value) => error ? rej(error) : res(value),
    ),
  )

  return {
    hash: hash.toString("hex"),
    salt,
  }
}

export const passwordCompare = async (
  password: string,
  hash: string,
  salt: string,
) => {

  return hash === (await passwordHash(password, salt)).hash
}
