import { test, expect, type Page } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { readFile, realpath, writeFile } from 'node:fs/promises'
import { resolve, relative, extname, isAbsolute } from 'node:path'
let server: Server, reference: string
const vendor = resolve('../../apps/desktop/vendor/drawio')
test.beforeAll(async () => {
  const root = await realpath(vendor)
  server = createServer(async (req, res) => {
    try {
      const file = resolve(
        root,
        '.' + decodeURIComponent(new URL(req.url!, 'http://localhost').pathname),
      )
      const child = relative(root, await realpath(file))
      if (child.startsWith('..') || isAbsolute(child)) throw Error('Outside fixture root')
      const types: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.txt': 'text/plain',
        '.xml': 'text/xml',
      }
      res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
      res.end(await readFile(file))
    } catch {
      res.statusCode = 404
      res.end('Not found')
    }
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  if (!address || typeof address === 'string') throw Error('Reference address')
  reference = 'http://127.0.0.1:' + address.port
})
test.afterAll(async () => {
  await new Promise<void>((done, reject) =>
    server.close((error) => (error ? reject(error) : done())),
  )
})
async function metrics(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const box = (node: Element) => {
      const r = node.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    }
    const css = (node: Element) => {
      const c = getComputedStyle(node)
      return {
        font: c.fontFamily,
        fontSize: c.fontSize,
        color: c.color,
        background: c.backgroundColor,
        borderTop: c.borderTop,
        paddingLeft: c.paddingLeft,
        paddingRight: c.paddingRight,
      }
    }
    return {
      bounds: box(el),
      style: css(el),
      controls: [...el.querySelectorAll('.geControlTab')].map((n) => ({
        bounds: box(n),
        style: css(n),
      })),
      pages: [...el.querySelectorAll('.gePageTab')].map((n) => ({
        text: n.textContent,
        bounds: box(n),
        style: css(n),
        label: box(n.querySelector('span')!),
        button: (() => {
          const el = n.querySelector('.geButton')!
          const c = getComputedStyle(el)
          return {
            bounds: box(el),
            width: c.width,
            minWidth: c.minWidth,
            boxSizing: c.boxSizing,
            margin: c.margin,
            padding: c.padding,
            border: c.border,
          }
        })(),
        glyph: (() => {
          const range = document.createRange()
          range.selectNodeContents(n.querySelector('span')!)
          return box(range as unknown as Element)
        })(),
      })),
    }
  })
}
test('pinned 31.5.2 and native footer have matching fine-pointer geometry and computed presentation', async ({
  page,
  context,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const stock = await context.newPage()
  await stock.setViewportSize({ width: 1280, height: 720 })
  await stock.goto(reference + '/index.html?splash=0&storage=device&offline=1&ui=atlas&lang=ru')
  await expect(stock.locator('.geTabContainer')).toBeVisible({
    timeout: 30000,
  })
  await stock.locator('.geTabContainer .geControlTab').first().click()
  await stock.locator('.geTabContainer .geControlTab').first().click()
  await page.goto('/pages-visual.html')
  await page.getByRole('button', { name: 'Добавить страницу', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить страницу', exact: true }).click()
  const expected = await metrics(stock, '.geTabContainer'),
    actual = await metrics(page, '.geTabContainer')
  const backgrounds = {
    expected: await stock
      .locator('.geEditor')
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    actual: await page
      .locator('.frade-page-strip')
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  }
  const canvas = await page.locator('.canvas').boundingBox()
  await writeFile(
    info.outputPath('backgrounds.json'),
    JSON.stringify(
      {
        backgrounds,
        canvas,
        footer: actual.bounds,
        layout: await page.locator('.canvas').evaluate((el) => ({
          inline: el.getAttribute('style'),
          height: getComputedStyle(el).height,
          rows: getComputedStyle(el.parentElement!).gridTemplateRows,
          footerPosition: getComputedStyle(document.querySelector('.frade-page-strip')!).position,
        })),
      },
      null,
      2,
    ),
  )
  await writeFile(
    info.outputPath('footer-metrics.json'),
    JSON.stringify({ expected, actual }, null, 2),
  )
  await info.attach('footer-metrics.json', {
    body: JSON.stringify(
      {
        expected,
        actual,
        exception:
          'Active native options target 24px instead of source 20px (+4px active tab, A11Y-004). All earlier inactive tabs must remain exact.',
      },
      null,
      2,
    ),
    contentType: 'application/json',
  })
  await stock.screenshot({ path: info.outputPath('pinned-three-pages.png') })
  await page.screenshot({ path: info.outputPath('native-three-pages.png') })
  expect(backgrounds.actual).toBe(backgrounds.expected)
  expect(canvas!.y + canvas!.height).toBe(actual.bounds.y)
  expect(actual.bounds).toEqual(expected.bounds)
  expect(actual.controls.slice(0, 2)).toEqual(expected.controls.slice(0, 2))
  expect(actual.pages.map((p) => p.text)).toEqual(expected.pages.map((p) => p.text))
  for (let i = 0; i < 3; i++) {
    expect(actual.pages[i].style).toEqual(expected.pages[i].style)
    expect(actual.pages[i].bounds.x).toBe(expected.pages[i].bounds.x)
    expect(actual.pages[i].bounds.y).toBe(expected.pages[i].bounds.y)
    expect(actual.pages[i].bounds.height).toBe(expected.pages[i].bounds.height)
    expect(actual.pages[i].bounds.width).toBe(
      expected.pages[i].bounds.width +
        (expected.pages[i].button.bounds.width
          ? Math.max(0, 24 - expected.pages[i].button.bounds.width)
          : 0),
    )
    expect(actual.pages[i].label).toEqual({
      ...expected.pages[i].label,
      y: expected.pages[i].bounds.y,
      height: 31,
    })
    expect(actual.pages[i].button.bounds).toEqual({
      ...expected.pages[i].button.bounds,
      width: expected.pages[i].button.bounds.width
        ? Math.max(24, expected.pages[i].button.bounds.width)
        : 0,
    })
    expect(actual.pages[i].glyph).toEqual(expected.pages[i].glyph)
  }
  await stock
    .locator('.gePageTab')
    .nth(2)
    .click({ button: 'right', position: { x: 30, y: 15 } })
  await page
    .locator('.gePageTab')
    .nth(2)
    .click({ button: 'right', position: { x: 30, y: 15 } })
  const menuMetrics = async (p: Page, selector: string) =>
    p.locator(selector).evaluate((el) => {
      const r = el.getBoundingClientRect(),
        c = getComputedStyle(el)
      return {
        bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
        font: c.fontFamily,
        fontSize: c.fontSize,
        border: c.border,
        shadow: c.boxShadow,
        rows: [...el.querySelectorAll('tr')]
          .filter((row) => row.querySelector('td.mxPopupMenuItem'))
          .map((row) => ({
            color: getComputedStyle(row).color,
            background: getComputedStyle(row).backgroundColor,
          })),
        html: el.outerHTML,
        sheets: [...document.styleSheets].map((s) => s.href),
        cells: [...el.querySelectorAll('tr')].map((row) =>
          [...row.children].map((td) => {
            const s = getComputedStyle(td),
              r = td.getBoundingClientRect()
            return {
              tag: td.tagName,
              class: td.className,
              padding: s.padding,
              font: s.font,
              height: r.height,
              width: r.width,
              inline: td.getAttribute('style'),
            }
          }),
        ),
        labels: [...el.querySelectorAll('td.mxPopupMenuItem')]
          .map((n) => n.textContent?.trim())
          .filter(Boolean),
      }
    })
  await writeFile(
    info.outputPath('source-inline-styles.json'),
    JSON.stringify(
      await stock.evaluate(() =>
        [...document.styleSheets]
          .filter((s) => !s.href)
          .map((s) =>
            [...s.cssRules].map((r) => r.cssText).filter((t) => /mxPopupMenu|font-size/.test(t)),
          ),
      ),
      null,
      2,
    ),
  )
  const menus = {
    expected: await menuMetrics(stock, 'div.mxPopupMenu:visible'),
    actual: await menuMetrics(page, '.frade-page-popup'),
  }
  await writeFile(info.outputPath('menu-metrics.json'), JSON.stringify(menus, null, 2))
  await stock.screenshot({ path: info.outputPath('pinned-page-menu.png') })
  await page.screenshot({ path: info.outputPath('native-page-menu.png') })
  await stock.locator('div.mxPopupMenu:visible tr').first().hover()
  await page.locator('.frade-page-popup [role="menuitem"]').first().hover()
  const hovered = {
    expected: await menuMetrics(stock, 'div.mxPopupMenu:visible'),
    actual: await menuMetrics(page, '.frade-page-popup'),
  }
  await writeFile(info.outputPath('hover-metrics.json'), JSON.stringify(hovered, null, 2))
  await stock
    .locator('div.mxPopupMenu:visible')
    .getByText('Переименовать Страница...', { exact: true })
    .click()
  await page.getByRole('menuitem', { name: 'Переименовать Страница...', exact: true }).click()
  const dialogMetrics = async (p: Page, selector: string) =>
    p.locator(selector).evaluate((el) => {
      const r = el.getBoundingClientRect(),
        s = getComputedStyle(el)
      return {
        bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
        background: s.backgroundColor,
        color: s.color,
        border: s.border,
        padding: s.padding,
        shadow: s.boxShadow,
        html: el.outerHTML,
        controls: [...el.querySelectorAll('input,button,.geButton')].map((n) => {
          const r = n.getBoundingClientRect(),
            c = getComputedStyle(n)
          return {
            tag: n.tagName,
            text: n.textContent,
            box: { x: r.x, y: r.y, width: r.width, height: r.height },
            font: c.font,
            color: c.color,
            margin: c.margin,
            padding: c.padding,
            backgroundSize: c.backgroundSize,
            opacity: c.opacity,
            placement: { position: c.position, top: c.top, right: c.right },
          }
        }),
        overlays: [...document.querySelectorAll('body > div')]
          .filter((n) => {
            const r = n.getBoundingClientRect(),
              c = getComputedStyle(n)
            return (
              r.width >= innerWidth - 1 &&
              r.height >= innerHeight - 1 &&
              ['absolute', 'fixed'].includes(c.position)
            )
          })
          .map((n) => ({
            html: n.outerHTML.slice(0, 300),
            background: getComputedStyle(n).backgroundColor,
            opacity: getComputedStyle(n).opacity,
          })),
        backdrop: {
          background: getComputedStyle(el, '::backdrop').backgroundColor,
          opacity: getComputedStyle(el, '::backdrop').opacity,
        },
        backgrounds: [...document.querySelectorAll('[class*="DialogBackground"]')].map((n) => ({
          html: n.outerHTML,
          background: getComputedStyle(n).backgroundColor,
          opacity: getComputedStyle(n).opacity,
        })),
      }
    })
  const dialogs = {
    expected: await dialogMetrics(stock, 'div.geDialog:visible'),
    actual: await dialogMetrics(page, '.frade-page-dialog'),
  }
  await writeFile(info.outputPath('rename-metrics.json'), JSON.stringify(dialogs, null, 2))
  await stock.screenshot({ path: info.outputPath('pinned-rename.png') })
  await page.screenshot({ path: info.outputPath('native-rename.png') })
  // Source targets below 24px expand only by their enumerated accessibility delta.
  for (let i = 0; i < dialogs.expected.controls.length; i++) {
    const source = dialogs.expected.controls[i],
      native = dialogs.actual.controls[i]
    const box = { ...source.box }
    if (i === 0) box.height = 24
    else if (i === 3) box.height = 24
    else box.y += 3
    expect(native.box).toEqual(box)
    for (const key of ['font', 'color', 'margin', 'padding', 'backgroundSize', 'opacity'] as const)
      expect(native[key]).toEqual(source[key])
  }
  const comparable = (value: typeof menus.actual) => ({
    bounds: value.bounds,
    font: value.font,
    fontSize: value.fontSize,
    border: value.border,
    shadow: value.shadow,
    rows: value.rows,
    labels: value.labels,
  })
  expect(comparable(menus.actual)).toEqual(comparable(menus.expected))
  expect(comparable(hovered.actual)).toEqual(comparable(hovered.expected))
  expect(dialogs.actual.bounds).toEqual(dialogs.expected.bounds)
  await stock.close()
})
test('forced-colors dark preserves system contrast in tabs, menus and dialog', async ({
  page,
}, info) => {
  await page.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' })
  await page.goto('/pages-visual.html')
  const tab = page.getByRole('tab', { name: 'Страница-1', exact: true })
  await tab.press('Shift+F10')
  const row = page.getByRole('menuitem', {
    name: 'Переименовать Страница...',
    exact: true,
  })
  const colors = await row.evaluate((el) => {
    const c = getComputedStyle(el.querySelector('td.mxPopupMenuItem')!)
    const sample = document.createElement('div')
    sample.style.cssText = 'color:CanvasText;background:Canvas;forced-color-adjust:none'
    document.body.append(sample)
    const s = getComputedStyle(sample)
    const result = {
      actual: {
        color: c.color,
        background: (() => {
          let n: Element | null = el
          while (n) {
            const bg = getComputedStyle(n).backgroundColor
            if (bg !== 'rgba(0, 0, 0, 0)') return bg
            n = n.parentElement
          }
          return 'transparent'
        })(),
      },
      system: { color: s.color, background: s.backgroundColor },
    }
    sample.remove()
    return result
  })
  expect(colors.actual).toEqual(colors.system)
  await row.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  const closeGlyph = await page.locator('.frade-page-close').evaluate((el) => {
    const sample = document.createElement('div')
    sample.style.backgroundColor = 'ButtonText'
    el.parentElement!.append(sample)
    const style = getComputedStyle(el),
      result = {
        mask: style.maskImage,
        color: style.backgroundColor,
        system: getComputedStyle(sample).backgroundColor,
      }
    sample.remove()
    return result
  })
  expect(closeGlyph.mask).not.toBe('none')
  expect(closeGlyph.color).toBe(closeGlyph.system)
  await page.screenshot({ path: info.outputPath('forced-colors-dark.png') })
})
test('320px, 200 percent text, coarse targets, Unicode labels and Tab remain usable', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/pages-visual.html?seed')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px'
  })
  const tab = page.getByRole('tab', { name: 'Страница-1', exact: true })
  await tab.focus()
  await tab.press('End')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tab', { name: 'Страница-20', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: 'Страница-20', exact: true }).dblclick()
  await page
    .getByRole('textbox', { name: 'Имя страницы' })
    .fill('Архитектура — 東京 / 🧭 '.repeat(20))
  await page.getByRole('button', { name: 'Переименовать', exact: true }).click()
  await expect(page.getByRole('tab').last()).toBeFocused()
  const state = await page.locator('.frade-page-strip').evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    font: parseFloat(getComputedStyle(el.querySelector('.geTab')!).fontSize),
    label: el.querySelector('.geActivePage .frade-page-label')!.getBoundingClientRect().width,
  }))
  expect(state.width).toBe(320)
  expect(state.font).toBe(26)
  expect(state.label).toBeLessThanOrEqual(160)
  await page.getByRole('button', { name: 'Страницы', exact: true }).focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Страницы', exact: true })).not.toBeFocused()
  await page.screenshot({ path: info.outputPath('text-200-width-320.png') })
})
test('coarse pointer enlarges actual targets while keeping the panel within a narrow editor', async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 480, height: 720 },
  })
  try {
    const page = await context.newPage()
    await page.goto(test.info().project.use.baseURL + '/pages-visual.html')
    expect(await page.evaluate(() => matchMedia('(pointer:coarse)').matches)).toBe(true)
    const targets = await page
      .locator(
        '.frade-page-strip [role=button],.frade-page-strip [role=tab],.frade-page-attribution',
      )
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => n.getBoundingClientRect().width > 0)
          .map((n) => ({
            label: n.getAttribute('aria-label') ?? n.textContent,
            width: n.getBoundingClientRect().width,
            height: n.getBoundingClientRect().height,
          })),
      )
    expect(targets.length).toBeGreaterThan(3)
    for (const target of targets) {
      expect(target.width, target.label ?? 'target').toBeGreaterThanOrEqual(44)
      expect(target.height, target.label ?? 'target').toBeGreaterThanOrEqual(44)
    }
    await page.getByRole('button', { name: 'Страницы', exact: true }).click()
    for (const row of await page.getByRole('menuitem').all()) {
      const b = await row.boundingBox()
      expect(b!.height).toBeGreaterThanOrEqual(44)
    }
    await page.screenshot({ path: info.outputPath('coarse-targets.png') })
  } finally {
    await context.close()
  }
})
test('page chrome remains pinned Light under dark system preference without semantic changes', async ({
  page,
}) => {
  await page.goto('/pages-visual.html')
  const before = await page.evaluate(() => JSON.stringify(window.pageFixture.session.snapshot()))
  const expected = await page.locator('.frade-page-strip').evaluate((el) => ({
    background: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
  }))
  await page.emulateMedia({ colorScheme: 'dark' })
  const actual = await page.locator('.frade-page-strip').evaluate((el) => ({
    background: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
  }))
  expect(actual).toEqual(expected)
  expect(await page.evaluate(() => JSON.stringify(window.pageFixture.session.snapshot()))).toBe(
    before,
  )
})

test('native footer omits external branding while page actions and overflow remain usable', async ({
  page,
}, info) => {
  await page.goto('/pages-visual.html')
  const footer = page.locator('.frade-page-strip')
  await expect(footer.getByRole('link')).toHaveCount(0)
  await expect(footer.locator('[title="jgraph/drawio"],.frade-page-attribution')).toHaveCount(0)
  await footer.getByRole('button', { name: 'Добавить страницу', exact: true }).click()
  await footer.getByRole('tab', { name: 'Страница-2', exact: true }).dblclick()
  await page.getByRole('textbox', { name: 'Имя страницы' }).fill('Без логотипа')
  await page.getByRole('button', { name: 'Переименовать', exact: true }).click()
  await expect(footer.getByRole('tab', { name: 'Без логотипа', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  for (let i = 0; i < 10; i++)
    await footer.getByRole('button', { name: 'Добавить страницу', exact: true }).click()
  for (const [width, target] of [
    [1280, 'Без логотипа'],
    [480, 'Страница-1'],
    [320, 'Без логотипа'],
  ] as const) {
    await page.setViewportSize({ width, height: 720 })
    await expect(footer.getByRole('link')).toHaveCount(0)
    await footer.getByRole('button', { name: 'Страницы', exact: true }).click()
    // The active page opens its reference submenu; choose an inactive page to navigate.
    await page.getByRole('menuitem', { name: target, exact: true }).click()
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(footer.getByRole('tab', { name: target, exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(
      footer.getByRole('button', { name: 'Добавить страницу', exact: true }),
    ).toBeVisible()
    const bounds = await footer.boundingBox()
    expect(bounds!.width).toBeLessThanOrEqual(width)
  }
  await page.screenshot({ path: info.outputPath('native-footer-no-branding.png') })
})
