import { it, expect } from 'vitest'
import {
  parsePresentationChoice,
  parsePresentationRecord,
  parsePresentationPhase,
  parsePresentationSnapshot,
  parsePresentationBoot,
  parsePresentationRequest,
  presentationRoles,
  PRESENTATION_MAX_BYTES,
  REQUEST_CHANNEL,
  EVENT_CHANNEL,
  healthRequest,
  parseRequest,
} from '../src/index'
import { builtinTokens } from '../../ui-workspace/src/design/generated/tokens'
const choice = {
  mode: 'system',
  density: 'compact',
  preferred: {
    light: 'frade.builtin/light',
    dark: 'frade.builtin/dark',
    'high-contrast': 'frade.builtin/high-contrast',
  },
}
const record = { version: 1, revision: 0, generation: 0, transactionId: 'boot', selection: choice }
const phase = {
  version: 1,
  requestId: 'window-1/intent-1',
  sessionId: 'window-1',
  generation: 1,
  transactionId: 'window-1/intent-1',
  revision: 1,
  membership: 1,
  phase: 'apply',
}
const colors = { ...builtinTokens.themes.light }
const snapshot = {
  id: 'frade.builtin/light',
  label: 'Frade Light',
  kind: 'light',
  density: 'compact',
  revision: 0,
  colors,
  effectiveColors: { ...colors },
  forcedColors: false,
  status: 'VALID',
  repairPasses: 0,
  issues: [],
  compatibility: { recognized: [...presentationRoles], ignored: [], repaired: [] },
}
it('validates separate choice/record/phase/snapshot/bootstrap without mutating or freezing source', () => {
  const original = JSON.stringify(snapshot),
    parsed = parsePresentationSnapshot(snapshot)
  expect(parsed).toEqual(snapshot)
  expect(Object.isFrozen(parsed.colors)).toBe(true)
  expect(Object.isFrozen(snapshot.colors)).toBe(false)
  expect(JSON.stringify(snapshot)).toBe(original)
  expect(parsePresentationChoice(choice)).toEqual(choice)
  expect(parsePresentationRecord(record)).toEqual(record)
  expect(parsePresentationPhase(phase)).toEqual(phase)
  expect(
    parsePresentationBoot({
      version: 1,
      sessionId: 'window-1',
      bootRevision: 0,
      snapshot,
      durable: record,
      diagnostics: [],
    }),
  ).toMatchObject({ snapshot, bootRevision: 0 })
  expect(presentationRoles).toEqual(Object.keys(builtinTokens.themes.light))
  expect(PRESENTATION_MAX_BYTES).toBe(32768)
})
it.each([
  null,
  [],
  { ...choice, mode: 'automatic' },
  { ...choice, density: 'dense' },
  { ...choice, path: 'C:/arbitrary' },
  { ...choice, preferred: { ...choice.preferred, light: 'https://example.invalid/theme' } },
  { ...choice, preferred: { light: 'frade.builtin/light' } },
])('rejects malformed choice %j', (value) => {
  expect(() => parsePresentationChoice(value)).toThrow()
})
it.each([
  { ...record, version: 2 },
  { ...record, revision: -1 },
  { ...record, generation: 0.5 },
  { ...record, transactionId: '../file' },
  { ...record, path: 'outside' },
  { ...record, selection: { ...choice, workspaceEnabled: true } },
])('rejects malformed persisted record %j', (value) => {
  expect(() => parsePresentationRecord(value)).toThrow()
})
it('refuses CSS injection, unknown/missing roles, arbitrary fields and forged forced-color mappings', () => {
  for (const patch of [
    { colors: { ...colors, 'text.primary': 'url(remote)' } },
    { colors: { ...colors, 'unknown.role': '#010203' } },
    { colors: { 'surface.base': '#FFFFFF' } },
    { effectiveColors: { ...colors, 'surface.base': 'Canvas' } },
    { effectiveColors: { ...colors, 'text.primary': 'Highlight' }, forcedColors: true },
    { repairPasses: 11 },
    { pluginExecution: true },
  ])
    expect(() => parsePresentationSnapshot({ ...snapshot, ...patch })).toThrow()
})
it('accepts only canonical final forced mapping while retaining HEX6 palette', () => {
  const effectiveColors = Object.fromEntries(
    presentationRoles.map((role) => [
      role,
      role.startsWith('surface.') || role.endsWith('Bg') || role === 'diagram.canvas'
        ? 'Canvas'
        : 'CanvasText',
    ]),
  )
  for (const role of [
    'action.primary',
    'action.primaryHover',
    'selection.bg',
    'selection.indicator',
    'focus.ring',
    'diagram.selection',
  ])
    effectiveColors[role] = 'Highlight'
  for (const role of ['action.onPrimary', 'selection.fg']) effectiveColors[role] = 'HighlightText'
  expect(
    parsePresentationSnapshot({ ...snapshot, forcedColors: true, effectiveColors }).colors,
  ).toEqual(colors)
})
it('bounded envelopes reject unknown fields, wrong phase/session and unsafe data before any mutation', () => {
  const request = {
    version: 1,
    requestId: 'window-1/intent-1',
    sessionId: 'window-1',
    operation: 'persist',
    payload: { context: phase, selection: choice, expectedRevision: 0 },
  }
  expect(parsePresentationRequest(request)).toEqual(request)
  for (const patch of [
    { version: 2 },
    { path: 'outside' },
    { operation: 'install' },
    { payload: { ...request.payload, context: { ...phase, sessionId: 'foreign' } } },
    { payload: { ...request.payload, context: { ...phase, phase: 'message-received' } } },
    { requestId: 'x'.repeat(40000) },
  ])
    expect(() => parsePresentationRequest({ ...request, ...patch })).toThrow()
  let invoked = false
  const getter = {
    get mode() {
      invoked = true
      return 'system'
    },
  }
  expect(() => parsePresentationChoice(getter)).toThrow()
  expect(invoked).toBe(false)
  const cyclic: { cycle?: unknown } = {}
  cyclic.cycle = cyclic
  expect(() => parsePresentationChoice(cyclic)).toThrow()
})
it('presentation exports preserve old health protocol request and channels', () => {
  expect(REQUEST_CHANNEL).toBe('frade:health')
  expect(EVENT_CHANNEL).toBe('frade:health-event')
  expect(parseRequest(healthRequest('id1'))).toEqual(healthRequest('id1'))
})
