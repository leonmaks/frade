// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { createThemeController } from '../../src/design/theme/index'
import { BUILTIN_IDS, createThemeRegistry } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'
import { applyRootSnapshot } from '../../src/design/theme/rootParticipant'
import type { PresentationSelection } from '../../src/design/theme/types'
import type { DurablePresentation, PhaseContext } from '../../src/design/theme/service'
import { createApplicationThemeRegistry } from '../../src/design/theme/registry'
import { contrastPairs, contrastRatio } from '../../src/design/theme/contrast'
import { projectReferenceStyles } from '../../src/design/reference/vscode-dark-2026/profile'
import { referenceTheme } from '../../src/design/reference/vscode-dark-2026/generated'

const referenceId = 'frade.reference/vscode-dark-2026'
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach((off) => off())
  document.body.replaceChildren()
})

function application() {
  const root = document.createElement('div')
  document.body.append(root)
  const selection: PresentationSelection = {
    mode: 'light',
    density: 'compact',
    preferred: { ...BUILTIN_IDS },
  }
  let generation = 0
  let durable: DurablePresentation = {
    revision: 0,
    generation: 0,
    transactionId: 'boot',
    selection,
  }
  const controller = createThemeController({
    root,
    sessionId: 'reference-test',
    initialSnapshot: resolveTheme({ registry: createThemeRegistry(), selection }),
    initialDurable: durable,
    paint: async () => {},
    host: {
      announceIntent: async () => ({ generation: ++generation }),
      persist: async (context: PhaseContext, next: PresentationSelection) => {
        durable = {
          revision: durable.revision + 1,
          generation: context.generation,
          transactionId: context.transactionId,
          selection: next,
        }
        return { status: 'ACK', durable }
      },
      reconcile: async (_context, published) => published,
    },
  })
  cleanups.push(() => controller.dispose())
  return { controller, root, selection }
}

it('reference application wiring preserves the core registry while providing the exact offline choice', () => {
  const { controller } = application()
  expect(
    createThemeRegistry()
      .list()
      .map((theme) => theme.id),
  ).toEqual(Object.values(BUILTIN_IDS))
  expect(controller.registry.get(referenceId)?.label).toBe('VS Code Dark 2026')
  expect(controller.registry.get(referenceId)?.kind).toBe('dark')
})

it('reference application resolution uses the pinned editor surface instead of builtin fallback', () => {
  const { controller, selection } = application()
  const result = resolveTheme({
    registry: controller.registry,
    selection: {
      ...selection,
      mode: 'dark',
      preferred: { ...selection.preferred, dark: referenceId },
    },
  })
  expect(result.id).toBe(referenceId)
  expect(result.colors['surface.base']).toBe('#121314')
})

it('root projection scopes the reference preset and removes it when restoring a builtin', () => {
  const root = document.createElement('div')
  const registry = createThemeRegistry([
    { id: referenceId, label: 'VS Code Dark 2026', kind: 'dark', colors: {} },
  ])
  root.setAttribute('data-owned-by-editor', 'preserved')
  root.style.setProperty('--unrelated-owner', 'kept')
  const selection: PresentationSelection = {
    mode: 'dark',
    density: 'comfortable',
    preferred: { ...BUILTIN_IDS, dark: referenceId },
  }
  applyRootSnapshot(root, resolveTheme({ registry, selection, revision: 1 }))
  expect(root.dataset.fradeReference).toBe('vscode-dark-2026')
  expect(root.dataset.fradeDensity).toBe('comfortable')
  applyRootSnapshot(
    root,
    resolveTheme({ registry, selection: { ...selection, mode: 'light' }, revision: 2 }),
  )
  expect(root.hasAttribute('data-frade-reference')).toBe(false)
  expect(root.style.getPropertyValue('--unrelated-owner')).toBe('kept')
  expect(root.getAttribute('data-owned-by-editor')).toBe('preserved')
})

it('reference keeps every canonical contrast pair and explicitly reports source adaptation', () => {
  const snapshot = resolveTheme({
    registry: createApplicationThemeRegistry(),
    selection: {
      mode: 'dark',
      density: 'compact',
      preferred: { ...BUILTIN_IDS, dark: referenceId },
    },
  })
  expect(snapshot.status).toBe('VALID')
  expect(referenceTheme.compatibility.repairs.length).toBeGreaterThan(0)
  for (const [foreground, background, minimum] of contrastPairs)
    expect(
      contrastRatio(snapshot.colors[foreground], snapshot.colors[background]),
    ).toBeGreaterThanOrEqual(minimum)
  expect(referenceTheme.compatibility.syntaxConsumer).toBe('NOT_IMPLEMENTED_RETAINED_ONLY')
  expect(referenceTheme.compatibility.colors).toHaveLength(325)
})

it('reference component paint has independent readable text, placeholder, focus-adjacent boundaries and button states', () => {
  const snapshot = resolveTheme({
    registry: createApplicationThemeRegistry(),
    selection: {
      mode: 'dark',
      density: 'comfortable',
      preferred: { ...BUILTIN_IDS, dark: referenceId },
    },
  })
  const before = JSON.stringify(referenceTheme)
  const paint = projectReferenceStyles(snapshot)
  const pairs: Array<[string, string, number]> = [
    ['controlForeground', 'controlBackground', 4.5],
    ['placeholder', 'controlBackground', 4.5],
    ['controlBorder', 'controlBackground', 3],
    ['primaryForeground', 'primaryBackground', 4.5],
    ['primaryForeground', 'primaryHover', 4.5],
    ['menuForeground', 'menuBackground', 4.5],
    ['menuSelectionForeground', 'menuSelection', 4.5],
    ['titleForeground', 'titleBackground', 4.5],
    ['railInactive', 'railBackground', 3],
    ['tabInactiveForeground', 'tabInactive', 4.5],
    ['statusForeground', 'statusBackground', 4.5],
  ]
  for (const [foreground, background, minimum] of pairs)
    expect(
      contrastRatio(paint.colors[foreground], paint.colors[background]),
    ).toBeGreaterThanOrEqual(minimum)
  expect(paint.colors.treeSelection).toBe('#383939')
  expect(JSON.stringify(referenceTheme)).toBe(before)
})

it('reference projection respects resolved overrides and forced colors remove supplemental paint', () => {
  const registry = createApplicationThemeRegistry()
  const selection: PresentationSelection = {
    mode: 'dark',
    density: 'compact',
    preferred: { ...BUILTIN_IDS, dark: referenceId },
  }
  const normal = resolveTheme({ registry, selection })
  const overridden = resolveTheme({
    registry,
    selection,
    overrides: { global: { 'text.primary': '#FFFFFF' } },
  })
  expect(projectReferenceStyles(overridden).colors.controlForeground).toBe(
    overridden.colors['text.primary'],
  )
  const root = document.createElement('div')
  applyRootSnapshot(root, normal)
  expect(root.style.getPropertyValue('--frade-vscode-editorBackground')).toBe('#121314')
  const forced = resolveTheme({ registry, selection, environment: { forcedColors: true } })
  applyRootSnapshot(root, forced)
  expect(root.hasAttribute('data-frade-reference')).toBe(false)
  expect(root.style.getPropertyValue('--frade-vscode-editorBackground')).toBe('')
  expect(root.style.getPropertyValue('--frade-surface-base')).toBe('Canvas')
})

it('reference identity cannot be replaced by an application extension descriptor', () => {
  const registry = createApplicationThemeRegistry([
    { id: referenceId, label: 'Spoofed', kind: 'light', colors: {} },
  ])
  expect(registry.get(referenceId)?.label).toBe('VS Code Dark 2026')
  expect(registry.get(referenceId)?.kind).toBe('dark')
  expect(registry.issues.some((issue) => issue.code === 'DUPLICATE_ID')).toBe(true)
})
it('failed reference activation rolls back an already projected preset through the real controller', async () => {
  const { controller, root, selection } = application()
  const host = document.createElement('div')
  document.body.append(host)
  controller.mountHost(host)
  await controller.whenReady()
  let referenceWasProjected = false
  const registration = controller.register({
    id: 'reference-refusal', generation: 1, hide: () => {}, reveal: () => {},
    prepare: async (snapshot) => {
      const ack = (context: PhaseContext) => ({ ...context, participantId: 'reference-refusal', participantGeneration: 1, painted: true as const })
      return {
        apply: async (context) => {
          if (snapshot.id === referenceId) {
            referenceWasProjected = root.dataset.fradeReference === 'vscode-dark-2026'
            throw Error('Controlled reference apply refusal')
          }
          return ack(context)
        },
        rollback: async (_previous, context) => ack(context), dispose: () => {},
      }
    },
  })
  await registration.ready
  cleanups.push(() => registration.dispose())
  const before = root.style.cssText
  const result = await controller.preview({ ...selection, mode: 'dark', preferred: { ...selection.preferred, dark: referenceId } })
  expect(referenceWasProjected).toBe(true)
  expect(result.status).toBe('REFUSED')
  expect(root.dataset.fradeTheme).toBe('light')
  expect(root.hasAttribute('data-frade-reference')).toBe(false)
  expect(root.style.getPropertyValue('--frade-vscode-editorBackground')).toBe('')
  expect(root.style.cssText).toBe(before)
  expect(controller.state().snapshot.id).toBe(BUILTIN_IDS.light)
  expect(controller.state().durableSelection).toEqual(selection)
})
