import { test, expect, type Page } from '@playwright/test'
import type { Graph } from '@antv/x6'
import type { DrawingSession } from '../../src/editor/drawingSession'
declare global {
  interface Window {
    drawingProbe: { graph: Graph; session: DrawingSession }
    drawParkingProbe: { canvas: HTMLElement; node: Element; before: string }
  }
}

test('parking a native drawing preserves live node DOM, all pages and undo history', async ({
  page,
}) => {
  await page.goto('/pages-visual.html')
  await expect.poll(() => page.evaluate(() => !!window.pageFixture)).toBe(true)
  await page.getByRole('button', { name: 'rect', exact: true }).click()
  await expect(page.locator('.x6-node')).toHaveCount(1)
  await page.evaluate(() => {
    const canvas = window.pageFixture.graph.container
    window.drawParkingProbe = {
      canvas,
      node: canvas.querySelector('.x6-node')!,
      before: JSON.stringify(window.pageFixture.session.snapshot()),
    }
    document.querySelector<HTMLElement>('#root')!.hidden = true
  })
  await page.evaluate(async () => {
    await new Promise<void>((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => done())),
    )
  })
  const parked = await page.evaluate(() => ({
    nodeConnected: window.drawParkingProbe.node.isConnected,
    nodeRetained:
      window.drawParkingProbe.canvas.querySelector('.x6-node') === window.drawParkingProbe.node,
    before: window.drawParkingProbe.before,
    after: JSON.stringify(window.pageFixture.session.snapshot()),
    canUndo: window.pageFixture.session.view().canUndo,
  }))
  expect(parked.nodeConnected).toBe(true)
  expect(parked.nodeRetained).toBe(true)
  expect(parked.after).toBe(parked.before)
  expect(parked.canUndo).toBe(true)
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('#root')!.hidden = false
  })
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('.x6-node')).toHaveCount(0)
})

async function probe(page: Page) {
  await page.goto('/editor-visual.html')
  await page.evaluate(async () => {
    const graphUrl = '/src/editor/createGraph.ts',
      sessionUrl = '/src/editor/drawingSession.ts'
    const { createGraph } = await import(graphUrl),
      { createDrawingSession } = await import(sessionUrl)
    const host = document.createElement('div')
    host.style.cssText = 'width:800px;height:500px;position:fixed;inset:0'
    document.body.append(host)
    const graph = createGraph(host)
    const session = createDrawingSession(
      graph,
      {
        format: 'frade-draw',
        version: 1,
        metadata: { id: 'probe', name: 'Probe' },
        graph: { nodes: [], edges: [] },
      },
      { firstPageName: 'Page-1' },
    )
    window.drawingProbe = { graph, session }
  })
}

test('semantic undo and redo complete their target views before returning', async ({ page }) => {
  await probe(page)
  await page.evaluate(async () => {
    const adapterUrl = '/src/document/graphAdapter.ts'
    const { nodeToCell } = await import(adapterUrl)
    window.drawingProbe.graph.addNode(
      nodeToCell({ id: 'atomic', shape: 'rect', x: 20, y: 30, width: 100, height: 60 }),
    )
  })
  await expect(page.locator('.x6-node[data-cell-id="atomic"]')).toBeVisible()
  const result = await page.evaluate(() => {
    const { graph, session } = window.drawingProbe,
      cell = graph.getCellById('atomic')!
    const asynchronous = graph.options.async
    const before = JSON.stringify(session.snapshot())
    cell.setProp('position', { x: 80, y: 100 })
    session.undo()
    const undo = {
      present: !!graph.container.querySelector('.x6-node[data-cell-id="atomic"]'),
      snapshot: JSON.stringify(session.snapshot()),
      asynchronous: graph.options.async,
    }
    session.redo()
    const redo = {
      present: !!graph.container.querySelector('.x6-node[data-cell-id="atomic"]'),
      position: graph.getCellById('atomic')!.getProp('position'),
      asynchronous: graph.options.async,
    }
    const moved = JSON.stringify(session.snapshot()),
      create = graph.createNode
    let message = ''
    graph.createNode = () => {
      throw Error('Controlled replay failure')
    }
    try {
      session.undo()
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    } finally {
      graph.createNode = create
    }
    const failed = {
      message,
      asynchronous: graph.options.async,
      snapshot: JSON.stringify(session.snapshot()),
      canUndo: session.view().canUndo,
    }
    session.undo()
    const recovered = {
      present: !!graph.container.querySelector('.x6-node[data-cell-id="atomic"]'),
      snapshot: JSON.stringify(session.snapshot()),
      asynchronous: graph.options.async,
    }
    return { before, moved, asynchronous, undo, redo, failed, recovered }
  })
  expect(result.undo.present).toBe(true)
  expect(result.undo.snapshot).toBe(result.before)
  expect(result.redo.present).toBe(true)
  expect(result.redo.position).toEqual({ x: 80, y: 100 })
  expect(result.undo.asynchronous).toBe(result.asynchronous)
  expect(result.redo.asynchronous).toBe(result.asynchronous)
  expect(result.failed.message).toBe('Controlled replay failure')
  expect(result.failed.asynchronous).toBe(result.asynchronous)
  expect(result.failed.snapshot).toBe(result.moved)
  expect(result.failed.canUndo).toBe(true)
  expect(result.recovered.present).toBe(true)
  expect(result.recovered.snapshot).toBe(result.before)
  expect(result.recovered.asynchronous).toBe(result.asynchronous)
})
test('page and native graph batches share chronological undo across navigation', async ({
  page,
}) => {
  await probe(page)
  const result = await page.evaluate(() => {
    const { graph: g, session: s } = window.drawingProbe
    const shape = (id: string) => ({
      id,
      shape: 'rect',
      x: 40,
      y: 40,
      width: 120,
      height: 60,
      attrs: { label: { text: id } },
    })
    const first = s.view().activeId
    g.batchUpdate('two shapes', () => {
      g.addNode(shape('a'))
      g.addNode(shape('b'))
    })
    s.insert('second', 'Page-2')
    g.addNode(shape('c'))
    s.select(first)
    s.select('second')
    s.select(first)
    s.undo()
    const one = {
      page: s.view().activeId,
      nodes: g.getNodes().map((n) => n.id),
    }
    s.undo()
    const two = {
      pages: s.view().pages.length,
      nodes: g.getNodes().map((n) => n.id),
    }
    s.undo()
    const three = {
      pages: s.view().pages.length,
      nodes: g.getNodes().map((n) => n.id),
      undo: s.view().canUndo,
    }
    s.redo()
    s.redo()
    s.redo()
    return { one, two, three, final: s.snapshot(), current: s.view().activeId }
  })
  expect(result.one).toEqual({ page: 'second', nodes: [] })
  expect(result.two.nodes).toEqual(['a', 'b'])
  expect(result.two.pages).toBe(1)
  expect(result.three).toEqual({ pages: 1, nodes: [], undo: false })
  expect(result.current).toBe('second')
  expect(result.final.version).toBe(2)
  if (result.final.version !== 2) throw Error('Expected v2')
  expect(result.final.pages.map((p) => p.graph.nodes.map((n) => n.id))).toEqual([['a', 'b'], ['c']])
})
test('page viewports are independent and malformed inactive content preserves graph/history', async ({
  page,
}) => {
  await probe(page)
  const result = await page.evaluate(() => {
    const { graph: g, session: s } = window.drawingProbe,
      first = s.view().activeId
    g.addNode({ id: 'a', shape: 'rect', x: 1, y: 2, width: 100, height: 50 })
    g.zoomTo(2)
    g.translate(20, 30)
    s.insert('second', 'Page-2')
    const secondZoom = g.zoom()
    s.select(first)
    const viewport = { zoom: g.zoom(), pan: g.translate() }
    const before = JSON.stringify(s.snapshot()),
      undo = s.view().canUndo
    let error = ''
    try {
      s.load({
        format: 'frade-draw',
        version: 2,
        metadata: { id: 'invalid', name: 'Invalid' },
        pages: [
          { id: 'good', name: 'Good', graph: { nodes: [], edges: [] } },
          {
            id: 'bad',
            name: 'Bad',
            graph: {
              nodes: [
                {
                  id: 'x',
                  shape: 'rect',
                  x: 0,
                  y: 0,
                  width: 0,
                  height: 10,
                  label: 'bad',
                },
              ],
              edges: [],
            },
          },
        ],
      })
    } catch (e) {
      error = String(e)
    }
    return {
      secondZoom,
      viewport,
      before,
      after: JSON.stringify(s.snapshot()),
      undo,
      afterUndo: s.view().canUndo,
      error,
      nodes: g.getNodes().map((n) => n.id),
    }
  })
  expect(result.secondZoom).toBe(1)
  expect(result.viewport).toEqual({ zoom: 2, pan: { tx: 20, ty: 30 } })
  expect(result.error).toContain('Invalid node')
  expect(result.after).toBe(result.before)
  expect(result.afterUndo).toBe(result.undo)
  expect(result.nodes).toEqual(['a'])
})
test('readonly permits navigation but rejects every page/history mutation', async ({ page }) => {
  await probe(page)
  const result = await page.evaluate(() => {
    const { session: s } = window.drawingProbe,
      first = s.view().activeId
    s.insert('second', 'Page-2')
    s.setReadOnly(true)
    const before = JSON.stringify(s.snapshot()),
      denied: string[] = []
    const operations = [
      () => s.insert('third', 'Third'),
      () => s.rename('second', 'Changed'),
      () => s.duplicate('second', 'copy', 'Copy'),
      () => s.remove('second', 'replacement', 'Page-1'),
      () => s.move('second', 0),
      () => s.sort('en'),
      () => s.clear('new', 'Page-1'),
      () => s.undo(),
      () => s.redo(),
    ]
    for (const op of operations)
      try {
        op()
      } catch (e) {
        denied.push(String(e))
      }
    s.select(first)
    s.select('second')
    return {
      before,
      after: JSON.stringify(s.snapshot()),
      denied,
      view: s.view(),
    }
  })
  expect(result.denied).toHaveLength(9)
  expect(result.denied.every((e) => e.includes('read-only'))).toBe(true)
  expect(result.after).toBe(result.before)
  expect(result.view.activeId).toBe('second')
  expect(result.view.canUndo).toBe(false)
})
test('canceled native gesture and rejected page command preserve semantic content and history', async ({
  page,
}) => {
  await probe(page)
  const result = await page.evaluate(async () => {
    const { graph: g, session: s } = window.drawingProbe
    // Use the same public semantic authoring boundary as the real editor, not raw X6 defaults.
    const adapter = '/src/document/graphAdapter.ts',
      { nodeToCell } = await import(adapter)
    const node = g.addNode(
      nodeToCell({
        id: 'a',
        shape: 'rect',
        x: 10,
        y: 20,
        width: 100,
        height: 60,
        label: '',
      }),
    )
    const before = JSON.stringify(s.snapshot())
    g.batchUpdate('canceled gesture', () => {
      node.position(200, 300)
      node.position(10, 20)
    })
    s.rename(s.view().activeId, '   ')
    const after = JSON.stringify(s.snapshot())
    s.undo()
    const undone = { nodes: g.getNodes().length, canUndo: s.view().canUndo }
    s.redo()
    return { before, after, undone, restored: JSON.stringify(s.snapshot()) }
  })
  expect(result.after).toBe(result.before)
  expect(result.undone).toEqual({ nodes: 0, canUndo: false })
  expect(result.restored).toBe(result.before)
})
for (const missing of ['source', 'target'] as const)
  test(`incomplete ${missing} rejects every capture transition without losing graph or history`, async ({
    page,
  }) => {
    await probe(page)
    const result = await page.evaluate(async (missing) => {
      const { graph, session } = window.drawingProbe
      const adapter = '/src/document/graphAdapter.ts',
        { nodeToCell } = await import(adapter)
      const node = graph.addNode(
        nodeToCell({ id: 'a', shape: 'rect', x: 10, y: 20, width: 100, height: 60 }),
      )
      const first = session.view().activeId
      graph.zoomTo(2)
      graph.translate(30, 40)
      session.insert('second', 'Page-2')
      session.select(first)
      graph.getCellById(node.id)!.setProp('position', { x: 50, y: 60 })
      session.undo()
      graph.select(graph.getCellById(node.id)!)
      const before = JSON.stringify(session.snapshot()),
        view = session.view(),
        generation = session.generation
      const liveNode = graph.getCellById(node.id)
      const pending = graph.addEdge({
        id: 'provisional',
        shape: 'edge',
        source: missing === 'source' ? { x: 5, y: 5 } : { cell: node.id },
        target: missing === 'target' ? { x: 300, y: 200 } : { cell: node.id },
      })
      const operations = {
        select: () => session.select('second'),
        insert: () => session.insert('third', 'Page-3'),
        rename: () => session.rename(first, 'Changed'),
        duplicate: () => session.duplicate(first, 'copy', 'Copy'),
        remove: () => session.remove(first, 'replacement', 'Page-1'),
        move: () => session.move(first, 1),
        sort: () => session.sort('en'),
        clear: () => session.clear('cleared', 'Page-1'),
        undo: () => session.undo(),
        redo: () => session.redo(),
        setName: () => session.setName('Changed document'),
        snapshot: () => session.snapshot(),
        extract: () => session.extract(first, 'extracted'),
      }
      const transitions = Object.entries(operations).map(([operation, action]) => {
        let error = ''
        try {
          action()
        } catch (caught) {
          error = String(caught)
        }
        return {
          operation,
          error,
          view: session.view(),
          generation: session.generation,
          nodeRetained: graph.getCellById(node.id) === liveNode,
          edgeRetained: graph.getCellById(pending.id) === pending,
          selected: graph.getSelectedCells().map((cell) => cell.id),
          viewport: { zoom: graph.zoom(), pan: graph.translate() },
        }
      })
      if (transitions.some((transition) => !transition.error))
        return { before, view, generation, transitions, canceled: null, undone: null, redone: null }
      graph.removeEdge(pending)
      const canceled = JSON.stringify(session.snapshot())
      session.undo()
      const undone = session.snapshot()
      session.redo()
      session.select(first)
      return {
        before,
        view,
        generation,
        transitions,
        canceled,
        undone,
        redone: JSON.stringify(session.snapshot()),
      }
    }, missing)
    for (const transition of result.transitions) {
      expect(transition.error, transition.operation).not.toBe('')
      expect(transition.view, transition.operation).toEqual(result.view)
      expect(transition.generation, transition.operation).toBe(result.generation)
      expect(transition.nodeRetained, transition.operation).toBe(true)
      expect(transition.edgeRetained, transition.operation).toBe(true)
      expect(transition.selected, transition.operation).toEqual(['a'])
      expect(transition.viewport, transition.operation).toEqual({
        zoom: 2,
        pan: { tx: 30, ty: 40 },
      })
    }
    expect(result.canceled).toBe(result.before)
    expect(result.undone?.version).toBe(1)
    if (result.undone?.version !== 1) throw Error('Expected original v1 after Undo')
    expect(result.undone.graph.nodes.map((node) => node.id)).toEqual(['a'])
    expect(result.redone).toBe(result.before)
  })

test('extracted v2 page preserves identity, graph, viewport and references with a new document identity', async ({
  page,
}) => {
  await probe(page)
  const result = await page.evaluate(() => {
    const { graph: g, session: s } = window.drawingProbe
    s.insert('details', 'Details / 東京')
    g.addNode({
      id: 'bound',
      shape: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      repositoryRef: { objectId: 'repository/object' },
    })
    g.zoomTo(2)
    g.translate(80, 90)
    const before = s.snapshot(),
      copy = s.extract('details', 'new-drawing')
    return { before, copy, after: s.snapshot() }
  })
  expect(result.copy.version).toBe(2)
  if (result.copy.version !== 2 || result.before.version !== 2)
    throw Error('Expected complete envelope')
  expect(result.copy.metadata.id).toBe('new-drawing')
  expect(result.copy.pages).toEqual([result.before.pages[1]])
  expect(result.copy.pages[0].viewport).toEqual({
    zoom: 2,
    pan: { x: 80, y: 90 },
  })
  expect(result.copy.pages[0].graph.nodes[0].repositoryRef).toEqual({
    objectId: 'repository/object',
  })
  expect(result.after).toEqual(result.before)
})
