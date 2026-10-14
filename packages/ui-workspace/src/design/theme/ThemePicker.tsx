import { useLayoutEffect, useRef, useState } from 'react'
import type { ThemeController } from './index'
import { useThemeControllerState } from './index'
import type { ManagedOverlays } from './overlays'
import type { PresentationSelection, ThemeMode } from './types'
export interface PresentationDialogProps {
  readonly controller: ThemeController
  readonly overlays: ManagedOverlays
  readonly opener: HTMLElement | null
  readonly onClosed: () => void
}
export const themeModeLabels: Readonly<Record<ThemeMode, string>> = {
  light: 'Светлая (Light)',
  dark: 'Тёмная (Dark)',
  'high-contrast': 'Контрастная (HC)',
  system: 'Системная (System)',
}
function choices(controller: ThemeController) {
  return [
    ...controller.registry
      .list()
      .filter((theme) => theme.enabled)
      .map((theme) => ({
        id: theme.id,
        mode: theme.kind as ThemeMode,
        label: theme.builtin ? themeModeLabels[theme.kind] : theme.label,
      })),
    { id: 'system', mode: 'system' as const, label: themeModeLabels.system },
  ]
}
function chosen(
  choice: { id: string; mode: ThemeMode },
  current: PresentationSelection,
): PresentationSelection {
  return {
    ...current,
    mode: choice.mode,
    preferred:
      choice.mode === 'system'
        ? { ...current.preferred }
        : { ...current.preferred, [choice.mode]: choice.id },
  }
}
function isChosen(choice: { id: string; mode: ThemeMode }, selection: PresentationSelection) {
  return (
    choice.mode === selection.mode &&
    (choice.mode === 'system' || choice.id === selection.preferred[choice.mode])
  )
}
export function ThemePicker(props: PresentationDialogProps): JSX.Element {
  const { controller, overlays, opener, onClosed } = props,
    state = useThemeControllerState(controller),
    options = choices(controller),
    dialog = useRef<HTMLDivElement>(null),
    latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  }, [props])
  const [focused, setFocused] = useState(() =>
    Math.max(
      0,
      options.findIndex((choice) => isChosen(choice, state.selection)),
    ),
  )
  const close = async () => {
    const result = await latest.current.controller.cancel()
    if (result.status !== 'CANCELED') return false
    latest.current.onClosed()
    return true
  }
  useLayoutEffect(
    () =>
      overlays.register({
        id: 'theme-picker',
        element: dialog.current!,
        priority: 300,
        modal: true,
        opener,
        initialFocus: dialog.current!.querySelector<HTMLElement>('[tabindex="0"]'),
        outside: 'cancel',
        cancel: close,
      }),
    [overlays, opener],
  )
  const preview = (index: number) => {
    setFocused(index)
    dialog.current?.querySelectorAll<HTMLElement>('[role="option"]')[index]?.focus()
    void controller.preview(chosen(options[index], controller.state().selection))
  }
  const commit = async () => {
    const result = await controller.commit(chosen(options[focused], controller.state().selection))
    if (result.status === 'COMMITTED') onClosed()
  }
  return (
    <div className="wb-modal-backdrop">
      <div
        ref={dialog}
        className="wb-dialog frade-theme-picker"
        role="dialog"
        aria-label="Выбор темы"
        aria-modal="true"
        aria-describedby="frade-theme-picker-status"
      >
        <h2>Выбор темы</h2>
        <p>Стрелки — предпросмотр, Enter — сохранить, Esc — восстановить выбор.</p>
        <div
          role="listbox"
          aria-label="Тема интерфейса"
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              const index =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? options.length - 1
                    : (focused + (event.key === 'ArrowDown' ? 1 : options.length - 1)) %
                      options.length
              preview(index)
            } else if (event.key === 'Enter') {
              event.preventDefault()
              void commit()
            }
          }}
        >
          {options.map((choice, index) => (
            <button
              type="button"
              role="option"
              key={choice.id}
              aria-selected={isChosen(choice, state.selection)}
              tabIndex={focused === index ? 0 : -1}
              disabled={state.phase === 'RECOVERY_BLOCKED'}
              onFocus={() => setFocused(index)}
              onClick={() => preview(index)}
            >
              {choice.label}
            </button>
          ))}
        </div>
        <p id="frade-theme-picker-status" role="status" aria-live="polite" aria-atomic="true">
          {state.message}
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="primary"
            disabled={state.busy || state.phase === 'RECOVERY_BLOCKED'}
            onClick={() => void commit()}
          >
            Сохранить выбор
          </button>
          <button type="button" onClick={() => void close()}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
export function PresentationSettings(
  props: PresentationDialogProps & { readonly onOpenPicker: (opener: HTMLElement) => void },
): JSX.Element {
  const { controller, overlays, opener, onOpenPicker } = props,
    state = useThemeControllerState(controller),
    dialog = useRef<HTMLDivElement>(null),
    latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  }, [props])
  const close = async () => {
    const result = await latest.current.controller.cancel()
    if (result.status !== 'CANCELED') return false
    latest.current.onClosed()
    return true
  }
  useLayoutEffect(
    () =>
      overlays.register({
        id: 'presentation-settings',
        element: dialog.current!,
        priority: 200,
        modal: true,
        opener,
        outside: 'cancel',
        cancel: close,
      }),
    [overlays, opener],
  )
  const modes: ThemeMode[] = ['light', 'dark', 'system', 'high-contrast']
  return (
    <div className="wb-modal-backdrop">
      <div
        ref={dialog}
        className="wb-dialog frade-presentation-settings"
        role="dialog"
        aria-label="Настройки интерфейса"
        aria-modal="true"
        aria-describedby="frade-presentation-status"
      >
        <h2>Настройки интерфейса</h2>
        <fieldset>
          <legend>Тема</legend>
          {modes.map((mode) => (
            <label key={mode}>
              <input
                type="radio"
                name="frade-presentation-theme"
                checked={state.selection.mode === mode}
                disabled={state.phase === 'RECOVERY_BLOCKED'}
                onChange={() => void controller.preview({ ...controller.state().selection, mode })}
              />
              {themeModeLabels[mode]}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Плотность</legend>
          {(['compact', 'comfortable'] as const).map((density) => (
            <label key={density}>
              <input
                type="radio"
                name="frade-presentation-density"
                checked={state.selection.density === density}
                disabled={state.phase === 'RECOVERY_BLOCKED'}
                onChange={() =>
                  void controller.preview({ ...controller.state().selection, density })
                }
              />
              {density === 'compact' ? 'Компактная' : 'Комфортная'}
            </label>
          ))}
        </fieldset>
        <button type="button" onClick={(event) => onOpenPicker(event.currentTarget)}>
          Выбрать тему…
        </button>
        <p id="frade-presentation-status" role="status" aria-live="polite" aria-atomic="true">
          {state.message}
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="primary"
            disabled={state.busy || state.phase === 'RECOVERY_BLOCKED'}
            onClick={() => void controller.commit(controller.state().selection)}
          >
            Применить
          </button>
          <button type="button" onClick={() => void close()}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
