import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  point,
  vector,
  type ModelPoint,
  type ModelVector,
  type ScreenPoint,
  type ViewPoint,
  type ViewVector,
} from '../../../../src/routing/model'
import {
  EPSILON,
  createViewTransform,
  evaluatePointTransformConditioning,
  evaluateVectorTransformConditioning,
  modelPointToView,
  modelVectorToView,
  screenPointToView,
  viewPointToModel,
  viewPointToScreen,
  viewVectorToModel,
} from '../../../../src/routing/geometry'

describe('R01 coordinate-space transforms', () => {
  it('separates model, view, and screen spaces at compile time', () => {
    expectTypeOf<ModelPoint>().not.toMatchTypeOf<ViewPoint>()
    expectTypeOf<ViewPoint>().not.toMatchTypeOf<ScreenPoint>()
    expectTypeOf<ModelVector>().not.toMatchTypeOf<ViewVector>()
  })

  it('uses point affine formulas and supplied screen offsets', () => {
    const transform = createViewTransform(2, vector(10, -20))
    const model = point(3, 4) as ModelPoint
    const view = modelPointToView(model, transform)
    expect(view).toEqual({ x: 16, y: -12 })
    expect(viewPointToModel(view, transform)).toEqual(model)
    const screen = viewPointToScreen(view, vector(100, 200))
    expect(screen).toEqual({ x: 116, y: 188 })
    expect(screenPointToView(screen, vector(100, 200))).toEqual(view)
  })

  it('scales vectors without positional translation', () => {
    const transform = createViewTransform(4, vector(1000, -1000))
    const model = vector(2, -3) as ModelVector
    const view = modelVectorToView(model, transform)
    expect(view).toEqual({ x: 8, y: -12 })
    expect(viewVectorToModel(view, transform)).toEqual(model)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects structurally invalid scale %s',
    (scale) => expect(() => createViewTransform(scale, vector(0, 0))).toThrow(/scale/i),
  )

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite translation and offset %s',
    (invalid) => {
      expect(() => createViewTransform(1, { x: invalid, y: 0 })).toThrow(/translation\.x/i)
      expect(() => viewPointToScreen(point(0, 0) as ViewPoint, { x: invalid, y: 0 })).toThrow(
        /offset\.x/i,
      )
    },
  )

  it('rejects non-finite forward, inverse, vector, and screen outputs', () => {
    expect(() =>
      modelPointToView(
        point(Number.MAX_VALUE, 0) as ModelPoint,
        createViewTransform(2, vector(0, 0)),
      ),
    ).toThrow(/modelPointToView.*result\.x/i)
    expect(() =>
      viewPointToModel(
        point(Number.MAX_VALUE, 0) as ViewPoint,
        createViewTransform(1, vector(-Number.MAX_VALUE, 0)),
      ),
    ).toThrow(/viewPointToModel.*result\.x/i)
    expect(() =>
      modelVectorToView(
        vector(Number.MAX_VALUE, 0) as ModelVector,
        createViewTransform(2, vector(0, 0)),
      ),
    ).toThrow(/modelVectorToView.*result\.x/i)
    expect(() =>
      viewPointToScreen(point(Number.MAX_VALUE, 0) as ViewPoint, vector(Number.MAX_VALUE, 0)),
    ).toThrow(/viewPointToScreen.*result\.x/i)
    expect(() =>
      screenPointToView(
        point(Number.MAX_VALUE, 0) as ScreenPoint,
        vector(-Number.MAX_VALUE, 0),
      ),
    ).toThrow(/screenPointToView.*result\.x/i)
    expect(() =>
      viewVectorToModel(
        vector(Number.MAX_VALUE, 0) as ViewVector,
        createViewTransform(1e-308, vector(0, 0)),
      ),
    ).toThrow(/viewVectorToModel.*result\.x/i)
  })

  it('implements the exact per-coordinate conditioning bound for category A', () => {
    const model = point(123.5, -987.25) as ModelPoint
    const transform = createViewTransform(2, vector(10, -20))
    const result = evaluatePointTransformConditioning(model, transform)
    const expectedX =
      (8 * Number.EPSILON * Math.max(1, 10, Math.abs(123.5 * 2), Math.abs(123.5 * 2 + 10))) /
      2
    const expectedY =
      (8 * Number.EPSILON * Math.max(1, 20, Math.abs(-987.25 * 2), Math.abs(-987.25 * 2 - 20))) /
      2
    expect(result).toEqual({ xErrorBound: expectedX, yErrorBound: expectedY, conditioned: true })
    const recovered = viewPointToModel(modelPointToView(model, transform), transform)
    expect(Math.abs(recovered.x - model.x)).toBeLessThanOrEqual(EPSILON)
    expect(Math.abs(recovered.y - model.y)).toBeLessThanOrEqual(EPSILON)
  })

  it('classifies the explicit category B pair as ill-conditioned but permits finite one-way execution', () => {
    const model = point(1, 2) as ModelPoint
    const transform = createViewTransform(1e-6, vector(1e9, 0))
    expect(evaluatePointTransformConditioning(model, transform).conditioned).toBe(false)
    expect(modelPointToView(model, transform)).toEqual({ x: 1 * 1e-6 + 1e9, y: 2e-6 })
  })

  it('uses translation zero for vector conditioning semantics', () => {
    const transform = createViewTransform(0.5, vector(1e9, -1e9))
    const model = vector(4, -8) as ModelVector
    expect(evaluateVectorTransformConditioning(model, transform).conditioned).toBe(true)
    expect(viewVectorToModel(modelVectorToView(model, transform), transform)).toEqual(model)
  })

  it('recovers the same conditioned model point across zoom values', () => {
    const model = point(123.25, -456.5) as ModelPoint
    for (const scale of [0.5, 1, 2]) {
      const transform = createViewTransform(scale, vector(50, -75))
      expect(evaluatePointTransformConditioning(model, transform).conditioned).toBe(true)
      const recovered = viewPointToModel(modelPointToView(model, transform), transform)
      expect(Math.abs(recovered.x - model.x)).toBeLessThanOrEqual(EPSILON)
      expect(Math.abs(recovered.y - model.y)).toBeLessThanOrEqual(EPSILON)
    }
  })
})
