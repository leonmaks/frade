import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { pageLabels } from './generated/drawio-pages'
import type { DrawingSession } from './drawingSession'
import { nextPageName } from '../document/drawing'
import './pages.css'
import { createPortal } from 'react-dom'

/** The embedding workbench supplies its existing overlay owner, without a UI dependency. */
export interface PageOverlayHost {
  readonly host: HTMLElement
  register(
    element: HTMLElement,
    options: {
      modal: boolean
      opener: HTMLElement
      initialFocus?: HTMLElement | null
      cancel(): void
    },
  ): () => void
}

type Locale = keyof typeof pageLabels
type MenuState = {
  kind: 'pages' | 'page' | 'current' | 'move'
  id: string
  x: number
  y: number
  opener: HTMLElement
  parent?: MenuState
  parentIndex?: number
}
type Item = {
  label: string
  action(opener: HTMLElement): void
  disabled?: boolean
  checked?: boolean
  submenu?: boolean
  dialog?: boolean
} | null
export function PageStrip({
  session,
  locale = 'ru',
  idPrefix,
  onError,
  onOpenPage,
  embedded,
  overlays,
}: {
  session: DrawingSession
  locale?: Locale
  idPrefix: string
  onError(message: string): void
  onOpenPage(id: string): void
  embedded?: boolean
  overlays?: PageOverlayHost
}) {
  const view = session.view(),
    t = pageLabels[locale],
    tabs = useRef(new Map<string, HTMLSpanElement>())
  const [focused, setFocused] = useState(view.activeId),
    [menu, setMenu] = useState<MenuState>(),
    [rename, setRename] = useState<{
      id: string
      name: string
      opener: HTMLElement
    }>(),
    [overflow, setOverflow] = useState(false),
    [atStart, setAtStart] = useState(true),
    [atEnd, setAtEnd] = useState(false),
    [dragId, setDragId] = useState<string>()
  const scroller = useRef<HTMLDivElement>(null),
    footer = useRef<HTMLElement>(null)
  const pointer = useRef<{ id: string; x: number; y: number }>()
  const dragging = useRef<{ id: string; generation: number }>()
  const renameRef = useRef(rename)
  useLayoutEffect(() => {
    renameRef.current = rename
  }, [rename])
  const focus = (id: string) => {
    setFocused(id)
    requestAnimationFrame(() => tabs.current.get(id)?.focus())
  }
  const run = (action: () => void) => {
    try {
      action()
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error))
    }
  }
  const closeMenu = () => {
    let first = menu
    while (first?.parent) first = first.parent
    const opener = first?.opener
    setMenu(undefined)
    if (opener?.isConnected) opener.focus()
  }
  useEffect(
    () =>
      session.subscribe((event) => {
        if (event === 'page' || event === 'load') {
          setMenu(undefined)
          setRename(undefined)
          setFocused(session.view().activeId)
        }
        if (event === 'load' || (event === 'readonly' && session.view().readOnly)) {
          dragging.current = undefined
          setDragId(undefined)
          const pending = renameRef.current
          setRename(undefined)
          if (pending)
            requestAnimationFrame(() => tabs.current.get(session.view().activeId)?.focus())
        }
      }),
    [session],
  )
  useEffect(() => {
    const cancel = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && dragging.current) {
        dragging.current = undefined
        setDragId(undefined)
        event.preventDefault()
        event.stopPropagation()
      }
    }
    document.addEventListener('keydown', cancel, true)
    return () => document.removeEventListener('keydown', cancel, true)
  }, [])
  const checkOverflow = () => {
    const node = scroller.current
    if (!node) return
    setOverflow(node.scrollWidth > node.clientWidth)
    setAtStart(node.scrollLeft <= 0)
    setAtEnd(node.scrollLeft + node.clientWidth >= node.scrollWidth - 1)
  }
  useLayoutEffect(() => {
    checkOverflow()
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(checkOverflow)
    if (footer.current) observer?.observe(footer.current)
    return () => observer?.disconnect()
  }, [view.pages.length, overflow])
  const pageNames = view.pages.map((p) => p.name).join('\0')
  useLayoutEffect(() => {
    tabs.current.get(view.activeId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    checkOverflow()
  }, [view.activeId, pageNames])
  const activate = (id: string) =>
    run(() => {
      session.select(id)
      setFocused(id)
      setMenu(undefined)
    })
  const numbered = (n: number) => t.pageWithNumber.replace('{1}', String(n))
  const insert = () =>
    run(() => {
      const state = session.view()
      const name = nextPageName(
        state.pages.map((p) => ({ ...p, graph: { nodes: [], edges: [] } })),
        numbered,
      )
      session.insert(crypto.randomUUID(), name)
    })
  function openPageMenu(id: string, opener: HTMLElement, x?: number, y?: number) {
    run(() => {
      session.select(id)
      const box = opener.getBoundingClientRect()
      setMenu({ kind: 'page', id, opener, x: x ?? box.left, y: y ?? box.top })
    })
  }
  function tabKey(event: KeyboardEvent<HTMLSpanElement>, id: string) {
    const index = view.pages.findIndex((p) => p.id === id)
    let target: number | undefined
    if (event.key === 'ArrowRight') target = (index + 1) % view.pages.length
    if (event.key === 'ArrowLeft') target = (index + view.pages.length - 1) % view.pages.length
    if (event.key === 'Home') target = 0
    if (event.key === 'End') target = view.pages.length - 1
    if (target !== undefined) {
      event.preventDefault()
      const id = view.pages[target].id
      setFocused(id)
      tabs.current.get(id)?.focus()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate(id)
    } else if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault()
      openPageMenu(id, event.currentTarget)
    }
  }
  function submenu(
    parent: MenuState,
    kind: MenuState['kind'],
    opener: HTMLElement,
    id = parent.id,
  ) {
    const b = opener.getBoundingClientRect()
    setMenu({
      kind,
      id,
      opener,
      x: b.right,
      y: b.top,
      parent,
      parentIndex: Number(opener.dataset.pageMenuIndex),
    })
  }
  function menuItems(info: MenuState): Item[] {
    const page = view.pages.find((p) => p.id === info.id)
    if (info.kind === 'pages')
      return [
        { label: t.insertPage, disabled: view.readOnly, action: insert },
        null,
        ...view.pages.map((p) => ({
          label: p.name,
          checked: p.id === view.activeId,
          submenu: p.id === view.activeId && !view.readOnly,
          action: (opener: HTMLElement) => {
            if (p.id === view.activeId && !view.readOnly) submenu(info, 'current', opener, p.id)
            else {
              session.select(p.id)
              focus(p.id)
            }
          },
        })),
        null,
        {
          label: t.sortPages,
          disabled: view.readOnly || view.pages.length < 2,
          action: () => session.sort(locale),
        },
        {
          label: t.deleteAll,
          disabled: view.readOnly,
          action: () => session.clear(crypto.randomUUID(), numbered(1)),
        },
      ]
    if (info.kind === 'move')
      return view.pages.flatMap((p, i) =>
        p.id === info.id ? [] : [{ label: p.name, action: () => session.move(info.id, i) }],
      )
    if (!page) return []
    const duplicate = {
      label: t.duplicateIt.replace('{1}', t.page),
      disabled: view.readOnly,
      action: () =>
        session.duplicate(page.id, crypto.randomUUID(), t.copyOf.replace('{1}', page.name)),
    }
    const move = {
      label: t.move,
      disabled: view.readOnly,
      submenu: true,
      action: (opener: HTMLElement) => submenu(info, 'move', opener),
    }
    const remove = {
      label: t.removeIt.replace('{1}', t.page),
      disabled: view.readOnly,
      action: () => session.remove(page.id, crypto.randomUUID(), numbered(1)),
    }
    const renameItem = {
      label: t.renameIt.replace('{1}', t.page) + '...',
      disabled: view.readOnly,
      dialog: true,
      action: () =>
        setRename({
          id: page.id,
          name: page.name,
          opener: tabs.current.get(page.id)!,
        }),
    }
    const separate = {
      label: t.openInNewWindow,
      action: () => onOpenPage(page.id),
    }
    if (info.kind === 'current')
      return [
        renameItem,
        remove,
        ...(view.pages.length > 1 ? [move, null] : []),
        duplicate,
        ...(!embedded ? [separate] : []),
      ]
    return [
      ...(!embedded ? [separate] : []),
      duplicate,
      null,
      ...(view.pages.length > 1 ? [move] : []),
      remove,
      renameItem,
    ]
  }
  const menus: MenuState[] = []
  for (let node = menu; node; node = node.parent) menus.unshift(node)
  const control = (
    label: string,
    glyph: string,
    action: (opener: HTMLElement) => void,
    disabled = false,
    hasMenu = false,
  ) => (
    <div
      role="button"
      className={'geTab geControlTab' + (disabled ? ' mxDisabled' : '')}
      tabIndex={disabled ? -1 : 0}
      title={label}
      aria-label={label}
      aria-disabled={disabled}
      aria-haspopup={hasMenu ? 'menu' : undefined}
      aria-expanded={hasMenu ? menus[0]?.kind === 'pages' : undefined}
      onClick={(event) => {
        if (!disabled) action(event.currentTarget)
      }}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          action(event.currentTarget)
        }
      }}
    >
      <div className={'geButton frade-page-glyph frade-page-' + glyph} aria-hidden="true" />
    </div>
  )
  return (
    <footer
      ref={footer}
      className="frade-page-strip geEditor"
      data-frade-page-surface="1"
      data-frade-editor="light"
    >
      <div className="geTabContainer geTabItem">
        {control(t.insertPage, 'insert', insert, view.readOnly)}
        {control(
          t.pages,
          'menu',
          (opener) => {
            const b = opener.getBoundingClientRect()
            setMenu({
              kind: 'pages',
              id: view.activeId,
              opener,
              x: b.left,
              y: b.top,
            })
          },
          false,
          true,
        )}
        <div
          className="geTabScroller"
          ref={scroller}
          role="tablist"
          aria-label={t.pages}
          onScroll={checkOverflow}
        >
          {view.pages.map((p, index) => (
            <div
              key={p.id}
              className={
                'geTab gePageTab' +
                (p.id === view.activeId ? ' geActivePage' : '') +
                (dragId === p.id ? ' gePageTabDragPlaceholder' : '')
              }
              title={p.name + ' (' + p.id + ') [' + (index + 1) + ']'}
              draggable={!view.readOnly}
              onClick={() => activate(p.id)}
              onDoubleClick={(event) => {
                if (!view.readOnly)
                  setRename({
                    id: p.id,
                    name: p.name,
                    opener: tabs.current.get(p.id) ?? event.currentTarget,
                  })
              }}
              onPointerDown={(event) => {
                pointer.current = {
                  id: p.id,
                  x: event.clientX,
                  y: event.clientY,
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                const at = pointer.current?.id === p.id ? pointer.current : undefined
                openPageMenu(
                  p.id,
                  tabs.current.get(p.id)!,
                  at?.x ?? event.clientX,
                  at?.y ?? event.clientY,
                )
              }}
              onDragStart={(event) => {
                if (view.readOnly) {
                  event.preventDefault()
                  return
                }
                const drag = { id: p.id, generation: session.generation }
                dragging.current = drag
                event.dataTransfer.setData('application/x-frade-page', p.id)
                event.dataTransfer.effectAllowed = 'move'
                requestAnimationFrame(() => {
                  if (dragging.current === drag) setDragId(p.id)
                })
              }}
              onDragOver={(event) => {
                if (dragging.current && !view.readOnly) {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                const drag = dragging.current
                dragging.current = undefined
                setDragId(undefined)
                if (drag && !view.readOnly && drag.generation === session.generation)
                  run(() => session.move(drag.id, index))
              }}
              onDragEnd={() => {
                dragging.current = undefined
                setDragId(undefined)
              }}
            >
              <span
                ref={(node) => {
                  if (node) tabs.current.set(p.id, node)
                  else tabs.current.delete(p.id)
                }}
                id={idPrefix + '-page-' + encodeURIComponent(p.id)}
                role="tab"
                aria-selected={p.id === view.activeId}
                aria-controls={idPrefix + '-canvas'}
                tabIndex={focused === p.id ? 0 : -1}
                className="frade-page-label"
                onKeyDown={(event) => tabKey(event, p.id)}
              >
                {p.name}
              </span>
              <div
                role="button"
                className="geButton frade-page-glyph frade-page-options"
                tabIndex={p.id === view.activeId ? 0 : -1}
                aria-label={p.name + ' — ' + t.options}
                aria-haspopup="menu"
                aria-expanded={menus[0]?.id === p.id && menus[0]?.kind === 'page'}
                onClick={(event) => {
                  event.stopPropagation()
                  openPageMenu(p.id, event.currentTarget)
                }}
                onKeyDown={(event) => {
                  if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
                    event.preventDefault()
                    event.stopPropagation()
                    openPageMenu(p.id, event.currentTarget)
                  }
                }}
              />
            </div>
          ))}
        </div>
        {overflow && (
          <>
            {control(
              locale === 'ru' ? 'Предыдущая страница' : 'Previous Page',
              'left',
              () => scroller.current?.scrollBy({ left: -160 }),
              atStart,
            )}
            {control(
              locale === 'ru' ? 'Следующая страница' : 'Next Page',
              'right',
              () => scroller.current?.scrollBy({ left: 160 }),
              atEnd,
            )}
          </>
        )}
        <a
          className="frade-page-attribution"
          href="https://github.com/jgraph/drawio"
          target="_blank"
          rel="noreferrer"
          title="jgraph/drawio"
          aria-label="jgraph/drawio"
        >
          <span aria-hidden="true" />
        </a>
      </div>
      {menus.map((info, index) => {
        const content = (
          <PageMenu
            key={info.kind + info.id}
            owner={idPrefix}
            overlays={overlays}
            expandedIndex={menus[index + 1]?.parentIndex}
            menu={info}
            items={menuItems(info)}
            close={closeMenu}
            back={() => {
              if (info.parent) {
                setMenu(info.parent)
                requestAnimationFrame(() => info.opener.focus())
              } else closeMenu()
            }}
            hover={(item, opener) => {
              if (item.submenu && !item.disabled) run(() => item.action(opener))
              else if (info !== menu) setMenu(info)
            }}
            execute={(item, opener) => {
              if (item.disabled) return
              run(() => item.action(opener))
              if (!item.submenu) {
                setMenu(undefined)
                if (!item.dialog) focus(session.view().activeId)
              }
            }}
          />
        )
        return overlays ? createPortal(content, overlays.host, info.kind + info.id) : content
      })}
      {rename && (
        <RenamePage
          overlays={overlays}
          opener={rename.opener}
          name={rename.name}
          title={t.rename}
          cancel={t.cancel}
          closeLabel={t.close}
          inputLabel={locale === 'ru' ? 'Имя страницы' : 'Page name'}
          inputId={idPrefix + '-rename-name'}
          readOnly={view.readOnly}
          close={() => {
            setRename(undefined)
            requestAnimationFrame(() => rename.opener.isConnected && rename.opener.focus())
          }}
          confirm={(value) => {
            run(() => session.rename(rename.id, value))
            setRename(undefined)
            focus(rename.id)
          }}
        />
      )}
    </footer>
  )
}

function PageMenu({
  owner,
  overlays,
  expandedIndex,
  menu,
  items,
  close,
  back,
  hover: onHover,
  execute,
}: {
  owner: string
  overlays?: PageOverlayHost
  expandedIndex?: number
  menu: MenuState
  items: Item[]
  close(): void
  back(): void
  hover(item: NonNullable<Item>, opener: HTMLElement): void
  execute(item: NonNullable<Item>, opener: HTMLElement): void
}) {
  const root = useRef<HTMLDivElement>(null),
    rows = useRef<(HTMLTableRowElement | null)[]>([])
  const [hover, setHover] = useState(-1)
  const closeRef = useRef(close)
  useLayoutEffect(() => {
    closeRef.current = close
  }, [close])
  useLayoutEffect(() => {
    if (!overlays || !root.current) return
    return overlays.register(root.current, {
      modal: false,
      opener: menu.opener,
      cancel: () => closeRef.current(),
    })
  }, [overlays, menu.opener])
  useLayoutEffect(() => {
    const node = root.current!
    node.style.left =
      Math.max(
        0,
        menu.parent && menu.x + node.offsetWidth > innerWidth
          ? menu.opener.getBoundingClientRect().left - node.offsetWidth
          : Math.min(menu.x, innerWidth - node.offsetWidth),
      ) + 'px'
    node.style.top = Math.max(0, Math.min(menu.y, innerHeight - node.offsetHeight)) + 'px'
    node.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus()
  }, [menu])
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        (event.target as Element)
          .closest('[data-frade-page-menu-owner]')
          ?.getAttribute('data-frade-page-menu-owner') !== owner
      )
        close()
    }
    document.addEventListener('pointerdown', outside, true)
    return () => document.removeEventListener('pointerdown', outside, true)
  }, [close, owner])
  const key = (event: KeyboardEvent) => {
    const enabled = items.flatMap((item, i) => (item && !item.disabled ? [i] : [])),
      current = rows.current.indexOf(document.activeElement as HTMLTableRowElement),
      index = enabled.indexOf(current)
    let next: number | undefined
    if (event.key === 'ArrowDown') next = enabled[(index + 1) % enabled.length]
    if (event.key === 'ArrowUp') next = enabled[(index + enabled.length - 1) % enabled.length]
    if (event.key === 'Home') next = enabled[0]
    if (event.key === 'End') next = enabled.at(-1)
    if (next !== undefined) {
      event.preventDefault()
      rows.current[next]?.focus()
      setHover(next)
    }
    if (event.key === 'Tab') {
      event.stopPropagation()
      close()
      return
    }
    if (event.key === 'Escape' || event.key === 'ArrowLeft') {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'ArrowLeft') back()
      else close()
    }
    const item = items[current]
    if (
      item &&
      (event.key === 'Enter' || event.key === ' ' || (event.key === 'ArrowRight' && item.submenu))
    ) {
      event.preventDefault()
      execute(item, rows.current[current]!)
    }
  }
  return (
    <div
      ref={root}
      className="frade-page-overlay geEditor"
      data-frade-page-menu-owner={owner}
      data-frade-page-surface="1"
      data-frade-editor="light"
      style={{ left: menu.x, top: menu.y }}
      onKeyDown={key}
    >
      <div className="mxPopupMenu frade-page-popup" role="menu">
        <table className="mxPopupMenu" role="presentation">
          <tbody>
            {items.map((item, i) =>
              item ? (
                <tr
                  key={i}
                  ref={(row) => {
                    rows.current[i] = row
                  }}
                  role="menuitem"
                  tabIndex={-1}
                  data-page-menu-index={i}
                  aria-label={item.label}
                  aria-disabled={!!item.disabled}
                  aria-haspopup={item.submenu ? 'menu' : undefined}
                  aria-expanded={item.submenu ? expandedIndex === i : undefined}
                  className={
                    (hover === i ? 'mxPopupMenuItemHover' : 'mxPopupMenuItem') +
                    (item.disabled ? ' mxDisabled' : '')
                  }
                  onMouseEnter={(event) => {
                    if (!item.disabled) {
                      setHover(i)
                      onHover(item, event.currentTarget)
                    }
                  }}
                  onMouseLeave={() => setHover(-1)}
                  onClick={(event) => execute(item, event.currentTarget)}
                >
                  <td className="mxPopupMenuIcon" />
                  <td className="mxPopupMenuItem">
                    {item.label}
                    {item.checked && <div className="frade-page-check" aria-hidden="true" />}
                  </td>
                  <td className="mxPopupMenuItem frade-page-submenu-cell">
                    {item.submenu && (
                      <div className="frade-page-submenu-glyph" aria-hidden="true" />
                    )}
                  </td>
                </tr>
              ) : (
                <tr key={i} role="separator">
                  <td className="mxPopupMenuIcon frade-page-separator-icon" />
                  <td colSpan={2} className="frade-page-separator-rule">
                    <hr />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
function RenamePage({
  overlays,
  opener,
  name,
  title,
  cancel,
  closeLabel,
  inputLabel,
  inputId,
  readOnly,
  confirm,
  close,
}: {
  overlays?: PageOverlayHost
  opener: HTMLElement
  name: string
  title: string
  cancel: string
  closeLabel: string
  inputLabel: string
  inputId: string
  readOnly: boolean
  confirm(value: string): void
  close(): void
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(name)
  const closeRef = useRef(close)
  useLayoutEffect(() => {
    closeRef.current = close
  }, [close])
  useLayoutEffect(() => {
    const node = dialog.current!
    if (!overlays) node.showModal()
    const unregister = overlays?.register(node, {
      modal: true,
      opener,
      initialFocus: input.current,
      cancel: () => closeRef.current(),
    })
    input.current?.select()
    return () => {
      unregister?.()
      if (node.open) node.close()
    }
  }, [overlays, opener])
  const content = (
    <div className="geEditor" data-frade-page-surface="1" data-frade-editor="light">
      {overlays && <div className="frade-page-modal-backdrop" aria-hidden="true" />}
      <dialog
        ref={dialog}
        open={overlays ? true : undefined}
        aria-modal="true"
        className="geDialog frade-page-dialog"
        aria-label={title}
        onKeyDown={(event) => {
          // Hosted modal navigation belongs to the existing Workbench dispatcher.
          // Other chords remain local so editing a name cannot save the document.
          if (!overlays || !['Escape', 'Tab'].includes(event.key)) event.stopPropagation()
        }}
        onCancel={(event) => {
          event.preventDefault()
          close()
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!readOnly && value.trim()) confirm(value)
          }}
        >
          <div className="frade-filename-grid">
            <div className="frade-filename-caption">
              <label htmlFor={inputId} title={title}>
                {title}:
              </label>
            </div>
            <div className="frade-filename-field">
              <input
                ref={input}
                id={inputId}
                aria-label={title + ': ' + inputLabel}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="frade-page-dialog-actions">
              <button type="button" className="geBtn" onClick={close}>
                {cancel}
              </button>
              <button
                type="submit"
                className="geBtn gePrimaryBtn"
                disabled={readOnly || !value.trim()}
              >
                {title}
              </button>
            </div>
          </div>
        </form>
        <div
          role="button"
          tabIndex={0}
          className="geButton frade-page-close"
          title={closeLabel}
          aria-label={closeLabel}
          onClick={close}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              close()
            }
          }}
        />
      </dialog>
    </div>
  )
  return overlays ? createPortal(content, overlays.host) : content
}
