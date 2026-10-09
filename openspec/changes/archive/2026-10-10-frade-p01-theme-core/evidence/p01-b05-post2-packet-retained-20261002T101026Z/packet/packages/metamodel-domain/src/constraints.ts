import { validDate, validDatetime } from './value-engine'
import type { JsonValue, Path, ObjectReference } from './types'
import { inspectJson } from './diagnostics'

/** Normalized, host-independent constraint language. Source dialects resolve references before use. */
export interface Constraint {
  readonly type?:
    'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null' | readonly string[]
  readonly title?: string
  readonly description?: string
  readonly group?: string
  readonly properties?: Readonly<Record<string, Constraint>>
  readonly patternProperties?: Readonly<Record<string, Constraint>>
  readonly additionalProperties?: boolean | Constraint
  readonly required?: readonly string[]
  readonly items?: Constraint
  readonly enum?: readonly JsonValue[]
  readonly const?: JsonValue
  readonly minimum?: number
  readonly maximum?: number
  readonly minLength?: number
  readonly maxLength?: number
  readonly minItems?: number
  readonly maxItems?: number
  readonly format?: 'date' | 'date-time'
  readonly pattern?: string
  readonly allOf?: readonly Constraint[]
  readonly anyOf?: readonly Constraint[]
  readonly oneOf?: readonly Constraint[]
  readonly if?: Constraint
  readonly then?: Constraint
  readonly else?: Constraint
  readonly referenceTargets?: readonly string[]
  readonly default?: JsonValue
}
export interface ConstraintIssue {
  readonly code: string
  readonly path: Path
  readonly rulePath: Path
  readonly message: string
  readonly value?: JsonValue
}
export interface ConstraintContext {
  readonly resolve?: (ref: ObjectReference) => string | undefined
}
const object = (x: unknown): x is Record<string, JsonValue> =>
  x !== null && typeof x === 'object' && !Array.isArray(x)
const keywords = new Set([
  'type',
  'title',
  'description',
  'group',
  'properties',
  'patternProperties',
  'additionalProperties',
  'required',
  'items',
  'enum',
  'const',
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'pattern',
  'format',
  'allOf',
  'anyOf',
  'oneOf',
  'if',
  'then',
  'else',
  'referenceTargets',
  'default',
])
export function checkConstraint(input: unknown): readonly ConstraintIssue[] {
  const safety = inspectJson(input)
  if (safety.length) return safety.map((d) => ({ ...d, rulePath: d.path }))
  const errors: ConstraintIssue[] = []
  const invalid = (path: Path, message: string) =>
    errors.push({ code: 'INVALID_CONSTRAINT', path, rulePath: path, message })
  const walk = (v: unknown, path: Path) => {
    if (!object(v)) {
      invalid(path, 'Expected constraint object')
      return
    }
    for (const key of Object.keys(v))
      if (!keywords.has(key)) invalid([...path, key], 'Unsupported constraint keyword')
    if (v.type !== undefined) {
      const ts = Array.isArray(v.type) ? v.type : [v.type]
      if (
        !ts.length ||
        ts.some(
          (t) =>
            !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(
              String(t),
            ),
        )
      )
        invalid([...path, 'type'], 'Invalid type')
    }
    for (const key of ['title', 'description', 'group', 'pattern'])
      if (v[key] !== undefined && typeof v[key] !== 'string')
        invalid([...path, key], 'Expected string')
    if (v.format !== undefined && !['date', 'date-time'].includes(String(v.format)))
      invalid([...path, 'format'], 'Unsupported format')
    if (typeof v.pattern === 'string') {
      try {
        new RegExp(v.pattern, 'u')
      } catch {
        invalid([...path, 'pattern'], 'Invalid regular expression')
      }
    }
    for (const key of ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems'])
      if (
        v[key] !== undefined &&
        (typeof v[key] !== 'number' ||
          !Number.isFinite(v[key]) ||
          (!['minimum', 'maximum'].includes(key) &&
            (!Number.isSafeInteger(v[key]) || (v[key] as number) < 0)))
      )
        invalid([...path, key], 'Invalid bound')
    for (const [min, max] of [
      ['minimum', 'maximum'],
      ['minLength', 'maxLength'],
      ['minItems', 'maxItems'],
    ])
      if (typeof v[min] === 'number' && typeof v[max] === 'number' && v[min] > v[max])
        invalid(path, 'Contradictory bounds')
    for (const key of ['required', 'referenceTargets'])
      if (
        v[key] !== undefined &&
        (!Array.isArray(v[key]) ||
          !(v[key] as JsonValue[]).every((x) => typeof x === 'string' && x.length))
      )
        invalid([...path, key], 'Expected string list')
    if (v.enum !== undefined && (!Array.isArray(v.enum) || !v.enum.length))
      invalid([...path, 'enum'], 'Expected nonempty enum')
    for (const key of ['properties', 'patternProperties'])
      if (v[key] !== undefined) {
        if (!object(v[key])) invalid([...path, key], 'Expected property map')
        else
          for (const [name, rule] of Object.entries(v[key])) {
            if (key === 'patternProperties') {
              try {
                new RegExp(name, 'u')
              } catch {
                invalid([...path, key, name], 'Invalid pattern')
              }
            }
            walk(rule, [...path, key, name])
          }
      }
    for (const key of ['items', 'if', 'then', 'else'])
      if (v[key] !== undefined) walk(v[key], [...path, key])
    if (v.additionalProperties !== undefined && typeof v.additionalProperties !== 'boolean')
      walk(v.additionalProperties, [...path, 'additionalProperties'])
    for (const key of ['allOf', 'anyOf', 'oneOf'])
      if (v[key] !== undefined) {
        if (!Array.isArray(v[key]) || !v[key].length)
          invalid([...path, key], 'Expected nonempty constraint list')
        else (v[key] as JsonValue[]).forEach((x, i) => walk(x, [...path, key, i]))
      }
  }
  walk(input, [])
  return errors
}
const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    object(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  )
export function validateConstraint(
  rule: Constraint,
  input: unknown,
  context: ConstraintContext = {},
): readonly ConstraintIssue[] {
  const safety = inspectJson(input),
    definition = checkConstraint(rule)
  if (definition.length) return definition
  if (safety.length) return safety.map((d) => ({ ...d, rulePath: [] }))
  let steps = 0
  const visit = (r: Constraint, v: JsonValue, path: Path, rp: Path): ConstraintIssue[] => {
    if (++steps > 100000) throw Error('Constraint budget exceeded')
    const errors: ConstraintIssue[] = []
    const emit = (
      code: string,
      key: string,
      message: string,
      value: JsonValue = v,
      p: Path = path,
    ) => errors.push({ code, path: p, rulePath: [...rp, key], message, value })
    const branch = (x: Constraint, key: string, index?: number) =>
      visit(x, v, path, index === undefined ? [...rp, key] : [...rp, key, index])
    for (const [i, x] of (r.allOf ?? []).entries()) errors.push(...branch(x, 'allOf', i))
    for (const key of ['anyOf', 'oneOf'] as const)
      if (r[key]) {
        const n = r[key]!.filter((x, i) => branch(x, key, i).length === 0).length
        if (key === 'anyOf' ? n === 0 : n !== 1)
          emit(
            'CONSTRAINT',
            key,
            key === 'anyOf'
              ? 'Не выполнен ни один допустимый вариант'
              : 'Должен выполняться ровно один вариант',
          )
      }
    if (r.if) {
      const yes = branch(r.if, 'if').length === 0
      if (yes && r.then) errors.push(...branch(r.then, 'then'))
      if (!yes && r.else) errors.push(...branch(r.else, 'else'))
    }
    const ref = object(v) && typeof v.repositoryId === 'string' && typeof v.objectId === 'string'
    if (r.referenceTargets) {
      if (!ref) emit('TYPE_MISMATCH', 'referenceTargets', 'Ожидается ссылка на объект')
      else {
        const target = context.resolve?.(v as unknown as ObjectReference)
        if (!target) emit('UNRESOLVED_REFERENCE', 'referenceTargets', 'Объект по ссылке не найден')
        else if (!r.referenceTargets.includes(target))
          emit('FORBIDDEN_TARGET', 'referenceTargets', 'Недопустимый тип объекта по ссылке')
      }
    } else if (r.type) {
      const types = Array.isArray(r.type) ? r.type : [r.type]
      const actual = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
      if (
        !types.some(
          (t) =>
            t === actual || (t === 'integer' && typeof v === 'number' && Number.isSafeInteger(v)),
        )
      )
        emit('TYPE_MISMATCH', 'type', 'Ожидается ' + types.join(' / '))
    }
    if (r.enum && !r.enum.some((x) => stable(x) === stable(v)))
      emit('CONSTRAINT', 'enum', 'Значение отсутствует в перечне')
    if (Object.hasOwn(r, 'const') && stable(r.const) !== stable(v))
      emit('CONSTRAINT', 'const', 'Значение не соответствует константе')
    if (typeof v === 'string') {
      if (r.format && !(r.format === 'date' ? validDate(v) : validDatetime(v)))
        emit('CONSTRAINT', 'format', 'Некорректная календарная дата')
      if (r.minLength !== undefined && [...v].length < r.minLength)
        emit('CONSTRAINT', 'minLength', 'Слишком короткое значение')
      if (r.maxLength !== undefined && [...v].length > r.maxLength)
        emit('CONSTRAINT', 'maxLength', 'Слишком длинное значение')
      if (r.pattern && !new RegExp(r.pattern, 'u').test(v))
        emit('CONSTRAINT', 'pattern', 'Значение не соответствует шаблону')
    }
    if (typeof v === 'number') {
      if (r.minimum !== undefined && v < r.minimum)
        emit('CONSTRAINT', 'minimum', 'Значение меньше допустимого')
      if (r.maximum !== undefined && v > r.maximum)
        emit('CONSTRAINT', 'maximum', 'Значение больше допустимого')
    }
    if (Array.isArray(v)) {
      if (r.minItems !== undefined && v.length < r.minItems)
        emit('CONSTRAINT', 'minItems', 'Недостаточно элементов')
      if (r.maxItems !== undefined && v.length > r.maxItems)
        emit('CONSTRAINT', 'maxItems', 'Слишком много элементов')
      if (r.items)
        v.forEach((item, i) =>
          errors.push(...visit(r.items!, item, [...path, i], [...rp, 'items'])),
        )
    } else if (object(v) && !r.referenceTargets) {
      for (const key of r.required ?? [])
        if (!Object.hasOwn(v, key))
          errors.push({
            code: 'REQUIRED',
            path: [...path, key],
            rulePath: [...rp, 'required', key],
            message: 'Обязательное поле отсутствует',
          })
      for (const [key, value] of Object.entries(v)) {
        const rules: { rule: Constraint; path: Path }[] = []
        if (r.properties?.[key])
          rules.push({ rule: r.properties[key], path: [...rp, 'properties', key] })
        for (const [pattern, schema] of Object.entries(r.patternProperties ?? {}))
          if (new RegExp(pattern, 'u').test(key))
            rules.push({ rule: schema, path: [...rp, 'patternProperties', pattern] })
        if (!rules.length && r.additionalProperties === false)
          emit('UNKNOWN_ATTRIBUTE', 'additionalProperties', 'Неизвестный атрибут', value, [
            ...path,
            key,
          ])
        else if (!rules.length && typeof r.additionalProperties === 'object')
          rules.push({ rule: r.additionalProperties, path: [...rp, 'additionalProperties'] })
        for (const item of rules) errors.push(...visit(item.rule, value, [...path, key], item.path))
      }
    }
    return errors
  }
  try {
    return visit(rule, input as JsonValue, [], [])
  } catch {
    return [
      {
        code: 'RESOURCE_LIMIT',
        path: [],
        rulePath: [],
        message: 'Constraint evaluation limit exceeded',
      },
    ]
  }
}
export interface FieldMetadata {
  readonly key: string
  readonly label: string
  readonly description: string
  readonly group: string
  readonly required: boolean
  readonly rule: Constraint
}
export function constraintFields(
  rule: Constraint,
  value?: JsonValue,
  context: ConstraintContext = {},
): readonly FieldMetadata[] {
  const map = new Map<string, Constraint[]>(),
    required = new Set<string>()
  const collect = (r: Constraint, mandatory = true) => {
    for (const [key, field] of Object.entries(r.properties ?? {})) {
      const list = map.get(key) ?? []
      list.push(field)
      map.set(key, list)
    }
    if (mandatory) for (const key of r.required ?? []) required.add(key)
    for (const x of r.allOf ?? []) collect(x, mandatory)
    for (const x of [...(r.anyOf ?? []), ...(r.oneOf ?? [])]) collect(x, false)
    if (r.if && value !== undefined) {
      const branch = validateConstraint(r.if, value, context).length === 0 ? r.then : r.else
      if (branch) collect(branch, mandatory)
    } else {
      if (r.then) collect(r.then, false)
      if (r.else) collect(r.else, false)
    }
  }
  collect(rule)
  return [...map].map(([key, rules]) => {
    const first = rules.find((r) => r.title) || rules[0]
    return {
      key,
      label: first.title ?? key,
      description: rules
        .map((r) => r.description)
        .filter(Boolean)
        .join('\n'),
      group: first.group ?? 'Основные свойства',
      required: required.has(key),
      rule: rules.length === 1 ? rules[0] : { ...first, allOf: rules },
    }
  })
}
