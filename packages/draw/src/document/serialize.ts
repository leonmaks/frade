import { type DiagramDocument, parseDocument } from './schema'
export type { DiagramDocument, DiagramNode, DiagramEdge } from './schema'
export const serializeDocument = (document: DiagramDocument) =>
  JSON.stringify(parseDocument(document), null, 2)
export const deserializeDocument = (json: string) => parseDocument(JSON.parse(json))
export {
  parseDrawingDocument,
  serializeDrawingDocument,
  deserializeDrawingDocument,
  semanticDrawing,
  drawingContentKey,
} from './drawing'
export type { DrawingDocument, MultipageDocument, DrawingPage } from './drawing'
