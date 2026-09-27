import {
  assertFiniteNumber,
  point,
  vector,
  type ModelPoint,
  type ModelVector,
  type ScreenPoint,
  type ViewPoint,
  type ViewVector,
} from '../model'
import { EPSILON } from './numbers'
import { assertFiniteResult, assertValidPoint, assertValidVector } from './validation'

export interface ViewTransform {
  readonly scale: number
  readonly translation: Readonly<{ x: number; y: number }>
}

export interface TransformConditioning {
  readonly xErrorBound: number
  readonly yErrorBound: number
  readonly conditioned: boolean
}

export function createViewTransform(
  scale: number,
  translation: Readonly<{ x: number; y: number }>,
): ViewTransform {
  assertFiniteNumber('createViewTransform', 'scale', scale)
  if (scale <= 0) {
    throw new RangeError(`createViewTransform: scale must be greater than zero; received ${scale}`)
  }
  assertFiniteNumber('createViewTransform', 'translation.x', translation.x)
  assertFiniteNumber('createViewTransform', 'translation.y', translation.y)
  return { scale, translation: { x: translation.x, y: translation.y } }
}

function coordinateErrorBound(coordinate: number, scale: number, translation: number): number {
  const scaled = assertFiniteResult(
    'evaluateTransformConditioning',
    'scaled coordinate',
    coordinate * scale,
  )
  const view = assertFiniteResult(
    'evaluateTransformConditioning',
    'view coordinate',
    scaled + translation,
  )
  const bound =
    (8 *
      Number.EPSILON *
      Math.max(1, Math.abs(translation), Math.abs(scaled), Math.abs(view))) /
    Math.abs(scale)
  return assertFiniteResult('evaluateTransformConditioning', 'error bound', bound)
}

export function evaluatePointTransformConditioning(
  value: ModelPoint,
  transform: ViewTransform,
): TransformConditioning {
  assertValidPoint('evaluatePointTransformConditioning', 'point', value)
  const valid = createViewTransform(transform.scale, transform.translation)
  const xErrorBound = coordinateErrorBound(value.x, valid.scale, valid.translation.x)
  const yErrorBound = coordinateErrorBound(value.y, valid.scale, valid.translation.y)
  return {
    xErrorBound,
    yErrorBound,
    conditioned: xErrorBound <= EPSILON && yErrorBound <= EPSILON,
  }
}

export function evaluateVectorTransformConditioning(
  value: ModelVector,
  transform: ViewTransform,
): TransformConditioning {
  assertValidVector('evaluateVectorTransformConditioning', 'vector', value)
  const valid = createViewTransform(transform.scale, transform.translation)
  const xErrorBound = coordinateErrorBound(value.x, valid.scale, 0)
  const yErrorBound = coordinateErrorBound(value.y, valid.scale, 0)
  return {
    xErrorBound,
    yErrorBound,
    conditioned: xErrorBound <= EPSILON && yErrorBound <= EPSILON,
  }
}

export function modelPointToView(value: ModelPoint, transform: ViewTransform): ViewPoint {
  assertValidPoint('modelPointToView', 'point', value)
  const valid = createViewTransform(transform.scale, transform.translation)
  const x = assertFiniteResult(
    'modelPointToView',
    'result.x',
    value.x * valid.scale + valid.translation.x,
  )
  const y = assertFiniteResult(
    'modelPointToView',
    'result.y',
    value.y * valid.scale + valid.translation.y,
  )
  return point(x, y) as ViewPoint
}

export function viewPointToModel(value: ViewPoint, transform: ViewTransform): ModelPoint {
  assertValidPoint('viewPointToModel', 'point', value)
  const valid = createViewTransform(transform.scale, transform.translation)
  const x = assertFiniteResult(
    'viewPointToModel',
    'result.x',
    (value.x - valid.translation.x) / valid.scale,
  )
  const y = assertFiniteResult(
    'viewPointToModel',
    'result.y',
    (value.y - valid.translation.y) / valid.scale,
  )
  return point(x, y) as ModelPoint
}

export function modelVectorToView(value: ModelVector, transform: ViewTransform): ViewVector {
  assertValidVector('modelVectorToView', 'vector', value)
  const valid = createViewTransform(transform.scale, transform.translation)
  const x = assertFiniteResult('modelVectorToView', 'result.x', value.x * valid.scale)
  const y = assertFiniteResult('modelVectorToView', 'result.y', value.y * valid.scale)
  return vector(x, y) as ViewVector
}

export function viewVectorToModel(value: ViewVector, transform: ViewTransform): ModelVector {
  assertValidVector('viewVectorToModel', 'vector', value)
  const valid = createViewTransform(transform.scale, transform.translation)
  const x = assertFiniteResult('viewVectorToModel', 'result.x', value.x / valid.scale)
  const y = assertFiniteResult('viewVectorToModel', 'result.y', value.y / valid.scale)
  return vector(x, y) as ModelVector
}

function assertOffset(operation: string, offset: Readonly<{ x: number; y: number }>): void {
  assertFiniteNumber(operation, 'offset.x', offset.x)
  assertFiniteNumber(operation, 'offset.y', offset.y)
}

export function viewPointToScreen(
  value: ViewPoint,
  offset: Readonly<{ x: number; y: number }>,
): ScreenPoint {
  assertValidPoint('viewPointToScreen', 'point', value)
  assertOffset('viewPointToScreen', offset)
  const x = assertFiniteResult('viewPointToScreen', 'result.x', value.x + offset.x)
  const y = assertFiniteResult('viewPointToScreen', 'result.y', value.y + offset.y)
  return point(x, y) as ScreenPoint
}

export function screenPointToView(
  value: ScreenPoint,
  offset: Readonly<{ x: number; y: number }>,
): ViewPoint {
  assertValidPoint('screenPointToView', 'point', value)
  assertOffset('screenPointToView', offset)
  const x = assertFiniteResult('screenPointToView', 'result.x', value.x - offset.x)
  const y = assertFiniteResult('screenPointToView', 'result.y', value.y - offset.y)
  return point(x, y) as ViewPoint
}

export function isPointTransformConditioned(value: ModelPoint, transform: ViewTransform): boolean {
  return evaluatePointTransformConditioning(value, transform).conditioned
}

export function isVectorTransformConditioned(value: ModelVector, transform: ViewTransform): boolean {
  return evaluateVectorTransformConditioning(value, transform).conditioned
}
