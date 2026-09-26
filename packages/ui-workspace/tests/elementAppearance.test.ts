import { expect, it } from 'vitest'
import {
  defaultAppearance,
  systemAppearance,
  readAppearance,
  validAppearance,
  drawioAppearance,
} from '../src/elementAppearance'
const resolve = (attributes: Record<string, unknown>) =>
  systemAppearance(
    { id: 'a', name: 'A', type: 'kadzo.v2023.systems', attributes },
    defaultAppearance,
  )!
it.each([
  [{}, '#F9F7ED', '#363939', 1],
  [{ 'change-type': 'Используется' }, '#D5E8D4', '#82B366', 1],
  [{ 'change-type': 'Разрабатывается' }, '#D5E8D4', '#82B366', 1],
  [{ 'change-type': 'Планируется' }, '#FFFF86', '#FF00FF', 2],
  [{ 'change-type': 'Модифицируется' }, '#D5E8D4', '#FF00FF', 1],
  [{ 'change-type': 'Выводится из эксплуатации' }, '#BAC8D3', '#23445D', 1],
  [{ 'change-type': 'unknown' }, '#F9F7ED', '#363939', 1],
  [{ 'target-status': 'Не целевая' }, '#E1D5E7', '#9673A6', 1],
  [{ 'target-status': 'Не целевая', 'change-type': 'Модифицируется' }, '#E1D5E7', '#FF00FF', 1],
  [{ 'target-status': 'Не целевая', 'change-type': 'Планируется' }, '#E1D5E7', '#FF00FF', 2],
  [
    { 'target-status': 'Не целевая', 'change-type': 'Выводится из эксплуатации' },
    '#E1D5E7',
    '#9673A6',
    1,
  ],
  [
    { location: 'Внешняя', 'target-status': 'Не целевая', 'change-type': 'Планируется' },
    '#DAE8FC',
    '#6C8EBF',
    1,
  ],
] as const)('resolves notation %#', (attributes, fill, stroke, width) => {
  const appearance = resolve(attributes)
  expect(appearance).toMatchObject({
    fill,
    stroke,
    width,
    shadow: { color: '#000000', opacity: 25, dx: 2, dy: 3, blur: 2 },
  })
  expect(drawioAppearance(appearance)).toMatchObject({
    rounded: '0',
    shadow: '1',
    fillColor: fill,
    strokeWidth: String(width),
  })
})
it('hides subsystem shadow, not an external-system shadow', () => {
  expect(resolve({ parent: 'parent-id' }).shadow).toBeUndefined()
  expect(resolve({ parent: ['parent-id'] }).shadow).toBeUndefined()
  expect(resolve({ parent: '   ' }).shadow).toBeDefined()
  expect(resolve({ location: 'Внешняя' }).shadow).toBeDefined()
})
it('matches explicit types and configurable field mappings without affecting other objects', () => {
  expect(
    systemAppearance({ id: 'a', name: 'A', type: 'something.systems' }, defaultAppearance),
  ).toBeUndefined()
  const config = structuredClone(defaultAppearance)
  config.system.typeIds = ['custom.system']
  config.system.fields.change = 'lifecycle'
  config.system.styles.planned.fill = '#123456'
  config.system.shadowEnabled = false
  expect(
    systemAppearance(
      { id: 'a', name: 'A', type: 'custom.system', attributes: { lifecycle: 'Планируется' } },
      config,
    ),
  ).toEqual({ fill: '#123456', stroke: '#FF00FF', width: 2 })
  expect(readAppearance(JSON.stringify(config))).toEqual(config)
})
it('rejects invalid settings and CSS injection and recovers defaults', () => {
  for (const patch of [
    null,
    {},
    {
      ...defaultAppearance,
      system: {
        ...defaultAppearance.system,
        shadow: { ...defaultAppearance.system.shadow, color: 'url(x)' },
      },
    },
    { ...defaultAppearance, system: { ...defaultAppearance.system, styles: {} } },
  ]) {
    expect(validAppearance(patch)).toBe(false)
    expect(readAppearance(JSON.stringify(patch))).toEqual(defaultAppearance)
  }
  expect(readAppearance('{')).toEqual(defaultAppearance)
})

it('migrates pre-bundle preferences without resetting customized system appearance', () => {
  const old = structuredClone(defaultAppearance) as Partial<typeof defaultAppearance>
  old.system!.styles.nonTarget.fill = '#123456'
  old.drawioLive = false
  delete old.emptyBundle
  expect(readAppearance(JSON.stringify(old))).toMatchObject({
    drawioLive: false,
    emptyBundle: { stroke: '#404040', width: 1 },
    system: { styles: { nonTarget: { fill: '#123456' } } },
  })
  expect(
    validAppearance({ ...defaultAppearance, emptyBundle: { stroke: 'url(x)', width: 1 } }),
  ).toBe(false)
  expect(
    validAppearance({ ...defaultAppearance, emptyBundle: { stroke: '#404040', width: 0 } }),
  ).toBe(false)
})
