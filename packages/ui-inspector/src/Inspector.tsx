import { useState } from 'react'
import { constraintFields, type Constraint, type FieldMetadata } from '@frade/metamodel-domain'
import type { JsonValue, RepositoryObject, Issue, ObjectRef } from '@frade/repository-domain'

export interface InspectorProps {
  object: RepositoryObject
  attributes: Readonly<Record<string, JsonValue>>
  rule: Constraint
  objects: readonly RepositoryObject[]
  sourceLocation?: string
  metadataSource?: string
  disabled?: boolean
  editableFields?: readonly string[]
  issues: readonly Issue[]
  raw: Readonly<Record<string, string>>
  onRaw: (path: string, value: string | undefined) => void
  onChange: (attributes: Record<string, JsonValue>) => void
  onOpenReference: (ref: ObjectRef) => void
}
const record = (v: unknown): v is Record<string, JsonValue> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
function effective(rule: Constraint): Constraint {
  const branches = [...(rule.allOf ?? []), ...(rule.anyOf ?? []), ...(rule.oneOf ?? [])].map(
    effective,
  )
  return Object.assign({}, ...branches, rule, {
    properties: Object.assign(
      {},
      ...branches.map((b) => b.properties ?? {}),
      rule.properties ?? {},
    ),
    ...([...branches, rule].some((b) => b.referenceTargets)
      ? {
          referenceTargets: [
            ...new Set([...branches, rule].flatMap((b) => b.referenceTargets ?? [])),
          ],
        }
      : {}),
  })
}
function initial(rule: Constraint): JsonValue {
  const r = effective(rule)
  if (Object.hasOwn(r, 'default')) return structuredClone(r.default!)
  if (r.enum?.length) return r.enum[0]
  if (r.referenceTargets) return { repositoryId: '', objectId: '' }
  const type = Array.isArray(r.type) ? r.type.find((t) => t !== 'null') : r.type
  return type === 'object'
    ? {}
    : type === 'array'
      ? []
      : type === 'number' || type === 'integer'
        ? 0
        : type === 'boolean'
          ? false
          : ''
}
function infer(value: JsonValue | undefined): Constraint {
  return {
    type:
      value === null
        ? 'null'
        : Array.isArray(value)
          ? 'array'
          : typeof value === 'object'
            ? 'object'
            : typeof value === 'number'
              ? 'number'
              : typeof value === 'boolean'
                ? 'boolean'
                : 'string',
  }
}
function ReferenceField({
  value,
  targets,
  props,
  label,
  onChange,
}: {
  value: JsonValue | undefined
  targets: readonly string[]
  props: InspectorProps
  label: string
  onChange: (v: JsonValue) => void
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(''),
    [limit, setLimit] = useState(50)
  const ref =
    record(value) && typeof value.objectId === 'string'
      ? (value as unknown as ObjectRef)
      : undefined
  const target = ref
    ? props.objects.find(
        (o) => o.ref.objectId === ref.objectId && o.ref.repositoryId === ref.repositoryId,
      )
    : undefined
  const options = props.objects.filter(
    (o) =>
      targets.includes(o.typeId) &&
      (!query ||
        (o.name + ' ' + o.ref.objectId).toLocaleLowerCase().includes(query.toLocaleLowerCase())),
  )
  return (
    <div className="reference-control">
      <button
        type="button"
        className="reference-value"
        aria-label={label}
        disabled={props.disabled}
        onClick={() => setOpen(!open)}
      >
        {target?.name ?? (ref?.objectId ? `⚠ ${ref.objectId}` : 'Выбрать объект…')}
      </button>
      {target && (
        <button
          type="button"
          aria-label={`Перейти: ${label}`}
          title="Перейти к объекту"
          onClick={() => props.onOpenReference(target.ref)}
        >
          ↗
        </button>
      )}
      {open && (
        <div className="reference-picker" role="dialog" aria-label={`Выбор ссылки: ${label}`}>
          <input
            autoFocus
            placeholder="Поиск по имени или ID"
            aria-label={`Поиск ссылки: ${label}`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLimit(50)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setOpen(false)
              }
            }}
          />
          <div role="listbox">
            {options.slice(0, limit).map((o) => (
              <button
                role="option"
                aria-selected={o.ref.objectId === ref?.objectId}
                key={o.ref.objectId}
                onClick={() => {
                  onChange(o.ref as unknown as JsonValue)
                  setOpen(false)
                }}
              >
                <span>{o.name}</span>
                <small>{o.ref.objectId}</small>
              </button>
            ))}
          </div>
          {options.length > limit && <button onClick={() => setLimit(limit + 50)}>Ещё 50</button>}
          {!options.length && <p>Подходящие объекты не найдены</p>}
          <button onClick={() => setOpen(false)}>Закрыть выбор</button>
        </div>
      )}
    </div>
  )
}
function Field({
  field,
  value,
  present,
  path,
  props,
  onChange,
}: {
  field: FieldMetadata
  value: JsonValue | undefined
  present: boolean
  path: (string | number)[]
  props: InspectorProps
  onChange: (value: JsonValue | undefined) => void
}) {
  const rule = effective(field.rule),
    key = JSON.stringify(path),
    label = field.label
  const raw = props.raw[key],
    errors = props.issues.filter((i) => JSON.stringify(i.path.slice(1)) === key)
  const declared = Array.isArray(rule.type) ? rule.type : rule.type ? [rule.type] : []
  const kind = rule.referenceTargets
    ? 'reference'
    : rule.enum
      ? 'enum'
      : (declared.find((t) => t !== 'null') ??
        (rule.items
          ? 'array'
          : Object.keys(rule.properties ?? {}).length
            ? 'object'
            : infer(value).type))
  const nullable = declared.includes('null') || value === null
  let control
  if (!present)
    control = (
      <button
        className="add-value"
        disabled={props.disabled}
        onClick={() => onChange(initial(rule))}
      >
        Добавить значение
      </button>
    )
  else if (value === null)
    control = (
      <div className="null-value">
        <code>null</code>
        <button
          disabled={props.disabled}
          onClick={() => onChange(initial({ ...rule, type: declared.filter((t) => t !== 'null') }))}
        >
          Задать значение
        </button>
      </div>
    )
  else if (kind === 'reference')
    control = (
      <ReferenceField
        value={value}
        targets={rule.referenceTargets ?? []}
        props={props}
        label={label}
        onChange={onChange}
      />
    )
  else if (kind === 'object') {
    const obj = record(value) ? value : {},
      known = constraintFields(field.rule, obj),
      extras = Object.keys(obj).filter((k) => !known.some((f) => f.key === k))
    control = (
      <fieldset disabled={props.disabled} className="nested-fields">
        <legend>{label}</legend>
        {[
          ...known,
          ...extras.map((k) => ({
            key: k,
            label: k,
            description: 'Дополнительный атрибут',
            group: 'Дополнительные',
            required: false,
            rule: infer(obj[k]),
          })),
        ].map((f) => (
          <Field
            key={f.key}
            field={f}
            value={obj[f.key]}
            present={Object.hasOwn(obj, f.key)}
            path={[...path, f.key]}
            props={props}
            onChange={(v) => {
              const next = { ...obj }
              if (v === undefined) delete next[f.key]
              else next[f.key] = v
              onChange(next)
            }}
          />
        ))}
      </fieldset>
    )
  } else if (kind === 'array') {
    const list = Array.isArray(value) ? value : []
    control = (
      <fieldset disabled={props.disabled} className="list-fields">
        <legend>
          {label} · {list.length}
        </legend>
        {list.map((v, i) => (
          <div className="list-item" key={i}>
            <Field
              field={{
                key: String(i),
                label: `${label} ${i + 1}`,
                description: '',
                group: '',
                required: true,
                rule: rule.items ?? infer(v),
              }}
              value={v}
              present
              path={[...path, i]}
              props={props}
              onChange={(next) => onChange(list.map((old, n) => (n === i ? (next ?? null) : old)))}
            />
            <div className="list-actions">
              <button
                aria-label={`Вверх: ${label} ${i + 1}`}
                disabled={i === 0}
                onClick={() => {
                  const next = [...list]
                  ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                  onChange(next)
                }}
              >
                ↑
              </button>
              <button
                aria-label={`Удалить: ${label} ${i + 1}`}
                onClick={() => onChange(list.filter((_, n) => n !== i))}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button onClick={() => onChange([...list, initial(rule.items ?? { type: 'string' })])}>
          Добавить элемент: {label}
        </button>
      </fieldset>
    )
  } else if (kind === 'enum')
    control = (
      <select
        aria-label={label}
        disabled={props.disabled}
        value={JSON.stringify(value)}
        onChange={(e) => onChange(JSON.parse(e.target.value))}
      >
        {!rule.enum?.some((v) => JSON.stringify(v) === JSON.stringify(value)) && (
          <option value={JSON.stringify(value)}>⚠ {String(value)}</option>
        )}
        {rule.enum?.map((v) => (
          <option key={JSON.stringify(v)} value={JSON.stringify(v)}>
            {String(v)}
          </option>
        ))}
      </select>
    )
  else if (kind === 'boolean')
    control = (
      <label className="checkbox">
        <input
          aria-label={label}
          type="checkbox"
          disabled={props.disabled}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        {value === true ? 'Да' : 'Нет'}
      </label>
    )
  else if (kind === 'number' || kind === 'integer')
    control = (
      <input
        aria-label={label}
        aria-invalid={raw !== undefined || errors.length > 0}
        inputMode="decimal"
        disabled={props.disabled}
        value={raw ?? String(value ?? '')}
        onChange={(e) => {
          const text = e.target.value
          const number = Number(text)
          if (
            !text.trim() ||
            !Number.isFinite(number) ||
            (kind === 'integer' && !Number.isSafeInteger(number))
          ) {
            props.onRaw(key, text)
          } else {
            props.onRaw(key, undefined)
            onChange(number)
          }
        }}
      />
    )
  else if (rule.format === 'date')
    control = (
      <input
        aria-label={label}
        type="date"
        disabled={props.disabled}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  else
    control = (
      <textarea
        aria-label={label}
        aria-invalid={errors.length > 0}
        disabled={props.disabled}
        rows={typeof value === 'string' && (value.includes('\n') || value.length > 100) ? 4 : 1}
        value={typeof value === 'string' ? value : String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  return (
    <div
      className={'field ' + (errors.length || raw !== undefined ? 'field-invalid' : '')}
      data-field-path={path.join('.')}
    >
      <div className="field-heading">
        <label title={field.key}>
          {label}
          {field.required && <span className="required"> *</span>}
        </label>
        <code>{field.key}</code>
        {present && !field.required && (
          <button
            className="field-remove"
            title="Удалить значение (не null)"
            aria-label={`Убрать значение: ${label}`}
            disabled={props.disabled}
            onClick={() => {
              props.onRaw(key, undefined)
              onChange(undefined)
            }}
          >
            ×
          </button>
        )}
        {present && nullable && value !== null && (
          <button disabled={props.disabled} onClick={() => onChange(null)}>
            null
          </button>
        )}
      </div>
      {control}
      {field.description && <div className="field-help">{field.description}</div>}
      {raw !== undefined && (
        <div className="field-error">
          Введите корректное {kind === 'integer' ? 'целое число' : 'число'}
        </div>
      )}
      {errors.map((e, i) => (
        <div className="field-error" key={i}>
          {e.message}
        </div>
      ))}
    </div>
  )
}
export function ObjectInspector(props: InspectorProps) {
  const [query, setQuery] = useState('')
  const fields = constraintFields(props.rule, props.attributes, {
    resolve: (ref) =>
      props.objects.find(
        (o) => o.ref.repositoryId === ref.repositoryId && o.ref.objectId === ref.objectId,
      )?.typeId,
  })
  const extras = Object.keys(props.attributes)
    .filter((k) => !fields.some((f) => f.key === k))
    .map((k) => ({
      key: k,
      label: k,
      description: 'Исходный атрибут вне схемы. Сохраняется вместе с объектом.',
      group: 'Дополнительные атрибуты',
      required: false,
      rule: infer(props.attributes[k]),
    }))
  const all = [...fields, ...extras].filter(
    (f) =>
      !query || (f.label + ' ' + f.key).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  )
  return (
    <div className="inspector">
      <div className="inspector-heading">
        <h1>{props.object.name}</h1>
        <div className="object-id">{props.object.ref.objectId}</div>
        <details className="object-sources">
          <summary>Источник и метаописание</summary>
          <p>{props.sourceLocation ?? 'Источник задаётся адаптером'}</p>
          <p>
            {props.metadataSource}
            {props.metadataSource?.includes('v2023')
              ? ' — историческое дополнение к модели v2025'
              : ''}
          </p>
        </details>
        <input
          aria-label="Поиск поля"
          placeholder="Найти свойство…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {[...new Set(all.map((f) => f.group))].map((group) => (
        <section className="field-group" key={group}>
          <h2>{group}</h2>
          {all
            .filter((f) => f.group === group)
            .map((f) => (
              <Field
                key={f.key}
                field={f}
                value={props.attributes[f.key]}
                present={Object.hasOwn(props.attributes, f.key)}
                path={[f.key]}
                props={
                  props.editableFields && !props.editableFields.includes(f.key)
                    ? { ...props, disabled: true }
                    : props
                }
                onChange={(v) => {
                  const next = { ...props.attributes }
                  if (v === undefined) delete next[f.key]
                  else next[f.key] = v
                  props.onChange(next)
                }}
              />
            ))}
        </section>
      ))}
    </div>
  )
}
