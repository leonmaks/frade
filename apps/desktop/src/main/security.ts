import { realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
export function trustedPage(url: string, devUrl?: string): boolean {
  try {
    const u = new URL(url)
    if (u.username || u.password) return false
    if (devUrl) {
      const d = new URL(devUrl)
      return (
        u.origin === d.origin &&
        ['/', '/index.html'].includes(u.pathname) &&
        ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) &&
        u.protocol === 'http:'
      )
    }
    return u.protocol === 'frade:' && u.host === 'app' && u.pathname === '/index.html' && !u.search
  } catch {
    return false
  }
}
export function authorizedSender(
  senderId: number,
  mainFrame: boolean,
  url: string,
  windowId: number,
  devUrl?: string,
) {
  return senderId === windowId && mainFrame && trustedPage(url, devUrl)
}
export async function resourcePath(root: string, url: string): Promise<string> {
  const u = new URL(url)
  if (u.protocol !== 'frade:' || u.host !== 'app' || u.username || u.password || u.search)
    throw new Error('FORBIDDEN')
  const pathname = decodeURIComponent(u.pathname)
  if (pathname.includes('\\') || pathname.includes('\0')) throw new Error('FORBIDDEN')
  const base = await realpath(root)
  const path = await realpath(resolve(base, '.' + pathname))
  const rel = relative(base, path)
  if (
    !rel ||
    rel === '..' ||
    rel.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) ||
    isAbsolute(rel)
  )
    throw new Error('FORBIDDEN')
  return path
}
export const productionCsp =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src frade://drawio; form-action 'none'"
