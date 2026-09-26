import { it, expect } from 'vitest'
import { flowStatusMarker, formatBundleFlowLabel } from '../src/flow-labels'
it('renders all four lifecycle markers without misclassifying unknown values', () => {
  expect(
    [
      'Используется',
      'Создается',
      'Создаётся',
      'Дорабатывается',
      'Удаляется',
      'Active',
      'unknown',
    ].map(flowStatusMarker),
  ).toEqual(['•', '+', '+', '~', '-', '•', '?'])
})
it('each flow starts a line and long names have four-character continuation indent', () => {
  const label = formatBundleFlowLabel(
    [
      { name: 'Первый поток', status: 'Используется' },
      {
        name: 'Очень длинное название интеграционного потока для нескольких систем',
        status: 'Создается',
      },
    ],
    32,
  )
  expect(label.split('\n')[0]).toBe('• Первый поток')
  expect(label).toContain('\n+ Очень')
  expect(
    label
      .split('\n')
      .slice(2)
      .every((line) => line.startsWith('\u00a0'.repeat(4))),
  ).toBe(true)
  expect(label).not.toContain('потоков')
  expect(formatBundleFlowLabel([])).toBe('')
})
