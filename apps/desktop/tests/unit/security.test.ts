import { it, expect } from 'vitest'
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { authorizedSender, resourcePath, trustedPage, productionCsp } from '../../src/main/security'
it('authorizes only this window main frame at the trusted page', () => {
  expect(authorizedSender(1, true, 'frade://app/index.html', 1)).toBe(true)
  expect(authorizedSender(2, true, 'frade://app/index.html', 1)).toBe(false)
  expect(authorizedSender(1, false, 'frade://app/index.html', 1)).toBe(false)
  expect(authorizedSender(1, true, 'https://example.com', 1)).toBe(false)
})
it('rejects confusing URLs and non-loopback dev origins', () => {
  for (const u of [
    'frade://evil/index.html',
    'frade://user@app/index.html',
    'frade://app/other.html',
    'frade://app/index.html?x=1',
    'https://app/index.html',
    'not-url',
  ])
    expect(trustedPage(u)).toBe(false)
  expect(trustedPage('http://localhost:5173/', 'http://localhost:5173')).toBe(true)
  expect(trustedPage('http://localhost:5174/', 'http://localhost:5173')).toBe(false)
  expect(trustedPage('http://example.com/', 'http://example.com')).toBe(false)
  expect(productionCsp).toContain("connect-src 'none'")
  expect(productionCsp).not.toContain('unsafe-eval')
})
it('serves only real paths contained in the renderer root', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'frade-resource-'))
  try {
    const root = join(temp, 'renderer')
    await mkdir(root)
    await writeFile(join(root, 'index.html'), 'ok')
    await writeFile(join(temp, 'secret.txt'), 'secret')
    expect(await resourcePath(root, 'frade://app/index.html')).toBe(join(root, 'index.html'))
    for (const u of [
      'frade://evil/index.html',
      'frade://app/%2e%2e%2fsecret.txt',
      'frade://app/%5c..%5csecret.txt',
      'frade://app/%00',
      'file:///secret.txt',
    ])
      await expect(resourcePath(root, u)).rejects.toThrow()
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
