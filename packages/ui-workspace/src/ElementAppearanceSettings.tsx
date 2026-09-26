import { useState } from 'react'
import {
  defaultAppearance,
  ruleLabels,
  validAppearance,
  type ElementAppearance,
  type RuleKey,
} from './elementAppearance'
export function ElementAppearanceSettings({
  value,
  onApply,
}: {
  value: ElementAppearance
  onApply(value: ElementAppearance): void
}) {
  const [draft, setDraft] = useState(() => structuredClone(value))
  const [message, setMessage] = useState('')
  const system = draft.system
  const update = (patch: Partial<typeof system>) => {
    setDraft({ ...draft, system: { ...system, ...patch } })
    setMessage('')
  }
  return (
    <details className="element-appearance-settings">
      <summary>Отображение элементов</summary>
      <p>Система — прямоугольник без скругления. Настройки общие для этого профиля приложения.</p>
      <label>
        Типы объектов (через запятую)
        <input
          aria-label="Типы объектов системы"
          value={system.typeIds.join(', ')}
          onChange={(e) => update({ typeIds: e.target.value.split(',').map((s) => s.trim()) })}
        />
      </label>
      <details>
        <summary>Поля метаописания</summary>
        {Object.entries({
          target: 'Целевой статус',
          change: 'Тип изменений',
          placement: 'Размещение',
          parent: 'ID родительской АС',
        }).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              aria-label={'Поле: ' + label}
              value={system.fields[key as keyof typeof system.fields]}
              onChange={(e) => update({ fields: { ...system.fields, [key]: e.target.value } })}
            />
          </label>
        ))}
      </details>
      <p>
        Приоритет сверху вниз: «Внешняя», «Не целевая» с уточнениями, тип изменений. Толщина — в
        единицах pt интерфейса Draw.io.
      </p>
      <table>
        <thead>
          <tr>
            <th>Условие</th>
            <th>Фон</th>
            <th>Контур</th>
            <th>Толщина, pt</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(ruleLabels) as RuleKey[]).map((key) => (
            <tr key={key}>
              <td>{ruleLabels[key]}</td>
              {(['fill', 'stroke'] as const).map((part) => (
                <td key={part}>
                  <input
                    type="color"
                    aria-label={ruleLabels[key] + (part === 'fill' ? ': фон' : ': контур')}
                    value={system.styles[key][part]}
                    onChange={(e) =>
                      update({
                        styles: {
                          ...system.styles,
                          [key]: { ...system.styles[key], [part]: e.target.value },
                        },
                      })
                    }
                  />
                  <code>{system.styles[key][part]}</code>
                </td>
              ))}
              <td>
                <input
                  type="number"
                  min="0.1"
                  max="20"
                  step="0.1"
                  aria-label={ruleLabels[key] + ': толщина'}
                  value={system.styles[key].width}
                  onChange={(e) =>
                    update({
                      styles: {
                        ...system.styles,
                        [key]: { ...system.styles[key], width: e.target.valueAsNumber },
                      },
                    })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <label>
        <input
          type="checkbox"
          checked={system.shadowEnabled}
          onChange={(e) => update({ shadowEnabled: e.target.checked })}
        />
        Тень систем (у подсистем всегда выключена)
      </label>
      <div className="appearance-shadow">
        <label>
          Цвет тени
          <input
            type="color"
            aria-label="Цвет тени"
            value={system.shadow.color}
            onChange={(e) => update({ shadow: { ...system.shadow, color: e.target.value } })}
          />
        </label>
        {(['opacity', 'dx', 'dy', 'blur'] as const).map((key, i) => (
          <label key={key}>
            {['Непрозрачность, %', 'Смещение X, px', 'Смещение Y, px', 'Размытие, px'][i]}
            <input
              type="number"
              aria-label={
                ['Непрозрачность тени', 'Смещение тени X', 'Смещение тени Y', 'Размытие тени'][i]
              }
              min={key === 'dx' || key === 'dy' ? -100 : 0}
              max="100"
              value={system.shadow[key]}
              onChange={(e) =>
                update({ shadow: { ...system.shadow, [key]: e.target.valueAsNumber } })
              }
            />
          </label>
        ))}
      </div>
      <fieldset className="empty-bundle-settings">
        <legend>Жгут — пустой</legend>
        <p>
          Сплошная линия без стрелок на обоих концах. Интеграционные потоки пока не добавляются.
        </p>
        <label>
          Цвет контура
          <input
            type="color"
            aria-label="Пустой жгут: цвет"
            value={draft.emptyBundle.stroke}
            onChange={(e) => {
              setDraft({ ...draft, emptyBundle: { ...draft.emptyBundle, stroke: e.target.value } })
              setMessage('')
            }}
          />
          <code>{draft.emptyBundle.stroke}</code>
        </label>
        <label>
          Толщина, pt
          <input
            type="number"
            min="0.1"
            max="20"
            step="0.1"
            aria-label="Пустой жгут: толщина"
            value={draft.emptyBundle.width}
            onChange={(e) => {
              setDraft({
                ...draft,
                emptyBundle: { ...draft.emptyBundle, width: e.target.valueAsNumber },
              })
              setMessage('')
            }}
          />
        </label>
      </fieldset>
      <label>
        <input
          type="checkbox"
          checked={draft.drawioLive}
          onChange={(e) => {
            setDraft({ ...draft, drawioLive: e.target.checked })
            setMessage('')
          }}
        />
        Обновлять оформление из карточек в Draw.io
      </label>
      <p>
        Frade Draw обновляется автоматически. При выключенной синхронизации Draw.io правила
        действуют только при добавлении объекта. Изменения оформления сохраняются вместе с
        диаграммой.
      </p>
      <div className="dialog-actions">
        <button
          type="button"
          onClick={() => {
            if (!validAppearance(draft)) {
              setMessage('Проверьте типы, поля и числовые значения')
              return
            }
            onApply(draft)
            setMessage('Настройки отображения сохранены')
          }}
        >
          Применить отображение
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(structuredClone(defaultAppearance))
            setMessage('Для сохранения значений по умолчанию нажмите «Применить отображение»')
          }}
        >
          По умолчанию
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </details>
  )
}
