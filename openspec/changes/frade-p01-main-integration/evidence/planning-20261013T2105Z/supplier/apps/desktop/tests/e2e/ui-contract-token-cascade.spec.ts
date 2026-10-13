import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../../..')
const data = JSON.parse(
  readFileSync(resolve(root, 'packages/ui-workspace/tokens/tokens.json'), 'utf8'),
)
const roles: string[] = Object.keys(data.themes.light)
const forced: Record<string, string> = Object.fromEntries(
  roles.map((role) => [
    role,
    role.startsWith('surface.') ||
    role.endsWith('Bg') ||
    ['diagram.canvas', 'diagram.nodeBg'].includes(role)
      ? 'Canvas'
      : 'CanvasText',
  ]),
)
Object.assign(forced, {
  'action.primary': 'Highlight',
  'action.primaryHover': 'Highlight',
  'action.onPrimary': 'HighlightText',
  'selection.bg': 'Highlight',
  'selection.fg': 'HighlightText',
  'selection.indicator': 'Highlight',
  'focus.ring': 'Highlight',
  'diagram.selection': 'Highlight',
})
for (const scheme of ['light', 'dark'] as const)
  for (const active of [false, true])
    for (const theme of ['absent', 'system', 'light', 'dark', 'high-contrast']) {
      test(`UI-CASCADE:${scheme}:${theme}:${active ? 'forced' : 'normal'}`, async ({ page }) => {
        const sourceRed = process.env.FRADE_UI_CASCADE_SOURCE === 'upstream-red'
        const cssPath = sourceRed
          ? resolve(root, 'tests/ui-contract/fixtures/upstream.tokens.css')
          : resolve(root, 'packages/ui-workspace/src/design/generated/tokens.css')
        await page.emulateMedia({ colorScheme: scheme, forcedColors: active ? 'active' : 'none' })
        await page.setContent(
          '<!doctype html><html><head></head><body><div id="child"></div></body></html>',
        )
        await page.addStyleTag({ content: readFileSync(cssPath, 'utf8') })
        const actual = await page.evaluate(
          ({ theme, roles }) => {
            if (theme !== 'absent') document.documentElement.setAttribute('data-frade-theme', theme)
            const read = (el: Element) =>
              Object.fromEntries(
                roles.map((role) => [
                  role,
                  getComputedStyle(el)
                    .getPropertyValue('--frade-' + role.replaceAll('.', '-').replaceAll('_', '-'))
                    .trim(),
                ]),
              )
            return {
              root: read(document.documentElement),
              child: read(document.getElementById('child')!),
              dark: matchMedia('(prefers-color-scheme: dark)').matches,
              forced: matchMedia('(forced-colors: active)').matches,
            }
          },
          { theme, roles },
        )
        expect(actual.dark).toBe(scheme === 'dark')
        expect(actual.forced).toBe(active)
        const expected = active
          ? forced
          : data.themes[theme === 'absent' || theme === 'system' ? scheme : theme]
        expect(actual.root).toEqual(expected)
        expect(actual.child).toEqual(expected)
      })
    }
