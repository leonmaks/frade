import { createGraph } from './editor/createGraph'
import { installVisualApi } from './visual/api'
const root = document.querySelector('#visual-root') as HTMLElement
const graph = createGraph(root)
installVisualApi(graph)
