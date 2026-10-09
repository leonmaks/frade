import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
export async function createFlowFixture() {
  const destination = await mkdtemp(join(tmpdir(), 'frade-flows-')),
    dataRoot = join(destination, 'data'),
    metadataRoot = join(destination, 'metadata')
  const put = async (root, path, value) => {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(
      join(root, path),
      typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    )
  }
  const semantics = {
    status: 'status',
    source: 'producer',
    consumer: 'receiver',
    search: ['description', 'producer', 'receiver', 'data', 'technology', 'status'],
    columns: [
      { field: 'data', label: 'Объекты данных' },
      { field: 'technology', label: 'Технологии' },
      { field: 'usage', label: 'Механизм использования' },
      { field: 'async', label: 'Асинхронный' },
      { field: 'status', label: 'Статус' },
    ],
    nonCloneable: ['audit', 'generated'],
    idPatterns: ['^F[0-9]+$'],
  }
  const systemRule = {
    type: 'object',
    required: ['title'],
    properties: { title: { type: 'string' } },
  }
  const reference = { $ref: '#/$rels/kadzo.v2023.systems.systems' }
  const flowRule = {
    type: 'object',
    required: ['description', 'producer', 'receiver'],
    properties: {
      description: { type: 'string', minLength: 2 },
      producer: reference,
      receiver: reference,
      data: { type: 'array', items: { type: 'string' } },
      technology: { type: 'array', items: { type: 'string' } },
      usage: { type: 'string' },
      async: { type: 'boolean' },
      status: {
        enum: ['Active', 'Planned', 'Используется', 'Создается', 'Дорабатывается', 'Удаляется'],
      },
      audit: { type: 'string' },
      generated: { type: 'string' },
      comments: { type: 'array', items: { type: 'string' } },
    },
  }
  await put(metadataRoot, 'kadzo/v2025/entities/root.yaml', {
    entities: {
      'kadzo.v2023.systems': {
        title: 'Системы',
        objects: { systems: { route: '/' } },
        schema: { patternProperties: { '.*': systemRule } },
      },
      'custom.flows': {
        title: 'Потоки',
        integrationFlow: semantics,
        schema: { patternProperties: { '^F[0-9]+$': flowRule } },
      },
    },
  })
  await put(metadataRoot, 'kadzo/v2023/entities/technical/tech_params.yaml', { entities: {} })
  for (const name of ['kadzo-app', 'kadzo-ba', 'kadzo-da', 'kadzo-change'])
    await put(metadataRoot, 'docs/metamodel/' + name + '.md', '# Synthetic fixture')
  await put(dataRoot, 'root.yaml', { imports: ['systems.yaml', 'flows.yaml'] })
  await put(dataRoot, 'systems.yaml', {
    'kadzo.v2023.systems': Object.fromEntries(
      ['A', 'B', 'C', 'D'].map((id) => [id, { title: id }]),
    ),
  })
  const pairs = [
    ['A', 'B'],
    ['B', 'A'],
    ['A', 'B'],
    ['A', 'C'],
    ['C', 'D'],
  ]
  const flows = Object.fromEntries(
    pairs.map(([a, b], i) => [
      'F' + (i + 1),
      {
        description: 'Payload F' + (i + 1),
        producer: a,
        receiver: b,
        data: ['Invoice', 'Order'],
        technology: ['HTTP', 'JSON'],
        usage: 'Business',
        async: true,
        status: i === 2 ? 'Planned' : 'Active',
        comments: ['Keep comment'],
        audit: 'not cloned',
        generated: 'not cloned',
      },
    ]),
  )
  await put(dataRoot, 'flows.yaml', { 'custom.flows': flows })
  await mkdir(join(dataRoot, '_diagrams'))
  const nodes = ['A', 'B', 'C', 'D'].map((id, i) => ({
    id: 'node-' + id,
    shape: 'rect',
    x: 40 + (i % 2) * 300,
    y: 80 + Math.floor(i / 2) * 250,
    width: 180,
    height: 75,
    label: id,
    repositoryRef: { objectId: id },
  }))
  const frade = {
    format: 'frade-draw',
    version: 1,
    metadata: { id: 'flows', name: 'Flows' },
    graph: { nodes, edges: [] },
  }
  await put(dataRoot, '_diagrams/Flows.frade', frade)
  const vertex = nodes
    .map(
      (n) =>
        '<UserObject id="' +
        n.id +
        '" label="' +
        n.label +
        '" fradeObjectId="' +
        n.label +
        '"><mxCell vertex="1" parent="1" style="rounded=0;whiteSpace=wrap;html=0;"><mxGeometry x="' +
        n.x +
        '" y="' +
        n.y +
        '" width="180" height="75" as="geometry"/></mxCell></UserObject>',
    )
    .join('')
  await put(
    dataRoot,
    '_diagrams/Flows.drawio',
    '<mxfile><diagram name="Page-1" id="page"><mxGraphModel grid="1" gridSize="4" page="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
      vertex +
      '</root></mxGraphModel></diagram></mxfile>',
  )
  return {
    destination,
    dataRoot,
    metadataRoot,
    flows,
    readFlows: async () =>
      JSON.parse(await readFile(join(dataRoot, 'flows.yaml'), 'utf8'))['custom.flows'],
  }
}
