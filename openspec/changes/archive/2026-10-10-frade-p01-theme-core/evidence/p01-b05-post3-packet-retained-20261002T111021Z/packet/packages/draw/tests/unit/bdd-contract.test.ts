import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'

const stepEvidence: Record<string, string> = {
  'a styled diagram with all shapes and an edited route is open':
    '../spike/document-roundtrip.spec.ts',
  'the diagram is downloaded and reopened': '../spike/document-roundtrip.spec.ts',
  'its document and rendered route are preserved': '../spike/document-roundtrip.spec.ts',
  'the reopened diagram remains editable': '../spike/document-roundtrip.spec.ts',
  'an invalid document is selected': '../spike/document-roundtrip.spec.ts',
  'an error is shown and the existing document is unchanged': '../spike/document-roundtrip.spec.ts',
  'Save As is confirmed with a new name': '../spike/document-roundtrip.spec.ts',
  'subsequent downloads use the new name and original identities':
    '../spike/document-roundtrip.spec.ts',
  'New is followed by Undo': '../spike/document-roundtrip.spec.ts',
  'the document stays empty with fresh identity and default viewport':
    '../spike/document-roundtrip.spec.ts',
  'a source terminal is fixed on the right boundary': 'preview-route.test.ts',
  'the target is still free': 'preview-route.test.ts',
  'the pointer moves behind the source': 'preview-route.test.ts',
  'the preview preserves a valid source exit': 'preview-route.test.ts',
  'the preview does not re-enter the source': 'preview-route.test.ts',
  'the editor is initialized': 'diagram-editor-lifecycle.test.tsx',
  'the user creates a new diagram': 'diagram-editor-lifecycle.test.tsx',
  'the graph contains no cells': 'diagram-editor-lifecycle.test.tsx',
  'the user creates a rectangle': 'diagram-editor-lifecycle.test.tsx',
  'exactly one node is added': 'diagram-editor-lifecycle.test.tsx',
  'a diagram contains a node': 'document-schema.test.ts',
  'the document is serialized and deserialized': 'graph-adapter.test.ts',
  'the node model is restored': 'graph-adapter.test.ts',
  'two rectangular nodes are connected in floating mode': 'floating-attachment-contract.test.ts',
  'their route is resolved': 'floating-route.test.ts',
  'the source attachment is on the source contour': 'floating-attachment-contract.test.ts',
  'the source terminal follows its outward normal': 'terminal-policy.test.ts',
  'two aligned floating rectangles': 'floating-route.test.ts',
  'the corridor is moved within both vertical intervals': 'floating-route.test.ts',
  'both attachments slide without unnecessary bends': 'floating-route.test.ts',
  'the corridor is moved outside attachment intervals': 'floating-route.test.ts',
  'the result is a valid orthogonal detour': 'floating-route.test.ts',
  'a selected edge has an eligible horizontal segment': 'segment-extraction.test.ts',
  'segment handles are derived': 'segment-extraction.test.ts',
  'the horizontal handle is centered and uses ns-resize': 'segment-extraction.test.ts',
  'a horizontal segment drag is active': 'segment-drag-session.test.ts',
  'the pointer moves vertically': 'segment-drag-controller.test.ts',
  'the live real route is orthogonal and visible': 'segment-drag-controller.test.ts',
  'a floating straight edge is selected': 'segment-symmetry.test.ts',
  'an unrelated object covers its requested corridor': 'segment-drag-controller.test.ts',
  'the segment follows the pointer through the unrelated object': 'segment-drag-controller.test.ts',
  'a segment drag has pending pointer updates': 'segment-drag-session.test.ts',
  'the drag is cancelled or committed': 'segment-persistence-history.test.ts',
  'pending updates are flushed or rolled back atomically': 'segment-persistence-history.test.ts',
}

type Scenario = {
  name: string
  tags: Array<{ name: string }>
  steps: Array<{ text: string }>
}

function contractErrors(source: string) {
  const document = new Parser(
    new AstBuilder(IdGenerator.incrementing()),
    new GherkinClassicTokenMatcher(),
  ).parse(source)
  const scenarios = (document.feature?.children ?? [])
    .map((child) => child.scenario as Scenario | undefined)
    .filter((scenario): scenario is Scenario => Boolean(scenario))
  const errors: string[] = []

  for (const scenario of scenarios) {
    if (!scenario.tags.some((tag) => /^@[A-Z]+-\d+$/.test(tag.name))) {
      errors.push(`${scenario.name}: missing stable requirement tag`)
    }
    for (const step of scenario.steps) {
      if (!stepEvidence[step.text]) errors.push(`${scenario.name}: unmapped step "${step.text}"`)
    }
  }

  return errors
}

describe('fail-closed Gherkin contract', () => {
  it('maps every committed scenario tag and step to executable evidence', () => {
    const featureRoot = resolve(process.cwd(), 'tests/features')
    const errors = readdirSync(featureRoot)
      .filter((file) => file.endsWith('.feature'))
      .flatMap((file) => contractErrors(readFileSync(resolve(featureRoot, file), 'utf8')))

    expect(errors).toEqual([])
  })

  it('rejects a scenario with a missing tag and unmapped step', () => {
    const errors = contractErrors(`
Feature: Contract probe
  Scenario: Unmapped probe
    Given an intentionally unmapped step
  `)

    expect(errors).toEqual([
      'Unmapped probe: missing stable requirement tag',
      'Unmapped probe: unmapped step "an intentionally unmapped step"',
    ])
  })
})
