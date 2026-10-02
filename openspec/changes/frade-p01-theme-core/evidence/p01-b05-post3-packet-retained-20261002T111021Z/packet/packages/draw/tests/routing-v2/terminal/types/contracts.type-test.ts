import {
  point,
  rect,
  type CoordinateSpace,
  type ModelSpace,
  type Point,
  type Rect,
  type ScreenSpace,
  type ViewSpace,
} from '../../../../src/routing/model'
import {
  anchorBinding,
  connectionConstraint,
  fixedBinding,
  floatingBinding,
  routingBoundsCenter,
  terminalGeometry,
  type AnchorBinding,
  type FixedBinding,
  type FloatingBinding,
  type TerminalGeometry,
} from '../../../../src/routing/terminal'

const constraint = connectionConstraint({ x: 0.25, y: 0.75, perimeter: true })

export function terminalContractTypes() {
  const modelPoint = point<ModelSpace>(1, 2)
  const viewPoint = point<ViewSpace>(3, 4)
  const screenPoint = point<ScreenSpace>(5, 6)
  const modelRect = rect<ModelSpace>(0, 0, 10, 20)
  const viewRect = rect<ViewSpace>(0, 0, 10, 20)
  const screenRect = rect<ScreenSpace>(0, 0, 10, 20)

  const modelGeometry: TerminalGeometry<ModelSpace> = terminalGeometry(modelRect, 'rectangle')
  const viewGeometry: TerminalGeometry<ViewSpace> = terminalGeometry(viewRect, 'ellipse')
  const screenGeometry: TerminalGeometry<ScreenSpace> = terminalGeometry(screenRect, 'rectangle')
  const modelAnchor: AnchorBinding<ModelSpace> = anchorBinding(modelPoint)
  const viewAnchor: AnchorBinding<ViewSpace> = anchorBinding(viewPoint)
  const screenAnchor: AnchorBinding<ScreenSpace> = anchorBinding(screenPoint)
  const modelFixed: FixedBinding<ModelSpace> = fixedBinding<ModelSpace>('model', constraint)
  const viewFixed: FixedBinding<ViewSpace> = fixedBinding<ViewSpace>('view', constraint)
  const screenFixed: FixedBinding<ScreenSpace> = fixedBinding<ScreenSpace>('screen', constraint)
  const modelFloating: FloatingBinding<ModelSpace> = floatingBinding<ModelSpace>('model')
  const viewFloating: FloatingBinding<ViewSpace> = floatingBinding<ViewSpace>('view')
  const screenFloating: FloatingBinding<ScreenSpace> = floatingBinding<ScreenSpace>('screen')

  const modelCenter: Point<ModelSpace> = routingBoundsCenter(modelGeometry)
  const viewCenter: Point<ViewSpace> = routingBoundsCenter(viewGeometry)
  const screenCenter: Point<ScreenSpace> = routingBoundsCenter(screenGeometry)

  // @ts-expect-error terminal geometry fields are readonly
  modelGeometry.routingBounds = modelRect
  // @ts-expect-error perimeter geometry fields are readonly
  modelGeometry.actualPerimeter.kind = 'ellipse'
  // @ts-expect-error binding identity is readonly
  modelFixed.cellId = 'other'
  // @ts-expect-error anchor coordinate fields are readonly
  modelAnchor.point.x = 7

  // Every model/view/screen cross-space direction must be rejected.
  // @ts-expect-error view geometry is not model geometry
  const viewAsModelGeometry: TerminalGeometry<ModelSpace> = viewGeometry
  // @ts-expect-error screen geometry is not model geometry
  const screenAsModelGeometry: TerminalGeometry<ModelSpace> = screenGeometry
  // @ts-expect-error model geometry is not view geometry
  const modelAsViewGeometry: TerminalGeometry<ViewSpace> = modelGeometry
  // @ts-expect-error screen geometry is not view geometry
  const screenAsViewGeometry: TerminalGeometry<ViewSpace> = screenGeometry
  // @ts-expect-error model geometry is not screen geometry
  const modelAsScreenGeometry: TerminalGeometry<ScreenSpace> = modelGeometry
  // @ts-expect-error view geometry is not screen geometry
  const viewAsScreenGeometry: TerminalGeometry<ScreenSpace> = viewGeometry

  // @ts-expect-error view binding is not model binding
  const viewAsModelFixed: FixedBinding<ModelSpace> = viewFixed
  // @ts-expect-error screen binding is not model binding
  const screenAsModelFixed: FixedBinding<ModelSpace> = screenFixed
  // @ts-expect-error model binding is not view binding
  const modelAsViewFloating: FloatingBinding<ViewSpace> = modelFloating
  // @ts-expect-error screen binding is not view binding
  const screenAsViewFloating: FloatingBinding<ViewSpace> = screenFloating
  // @ts-expect-error model anchor is not screen anchor
  const modelAsScreenAnchor: AnchorBinding<ScreenSpace> = modelAnchor
  // @ts-expect-error view anchor is not screen anchor
  const viewAsScreenAnchor: AnchorBinding<ScreenSpace> = viewAnchor

  const widenedPoint = point<ModelSpace | ViewSpace>(1, 2)
  const widenedRect = rect<ModelSpace | ViewSpace>(0, 0, 10, 20)
  const widenedGeometry = terminalGeometry(widenedRect, 'rectangle')
  const widenedAnchor = anchorBinding(widenedPoint)
  // @ts-expect-error invariant geometry cannot widen implicitly
  const widenedGeometryAlias: TerminalGeometry<ModelSpace | ViewSpace> = modelGeometry
  // @ts-expect-error invariant binding cannot widen implicitly
  const widenedFixedAlias: FixedBinding<ModelSpace | ViewSpace> = modelFixed
  // @ts-expect-error invariant anchor cannot widen implicitly
  const widenedAnchorAlias: AnchorBinding<ModelSpace | ViewSpace> = modelAnchor

  return {
    model: genericTerminalContracts(modelPoint, modelRect),
    view: genericTerminalContracts(viewPoint, viewRect),
    screen: genericTerminalContracts(screenPoint, screenRect),
    modelCenter,
    viewCenter,
    screenCenter,
    modelFixed,
    viewFixed,
    screenFixed,
    modelFloating,
    viewFloating,
    screenFloating,
    modelAnchor,
    viewAnchor,
    screenAnchor,
    widenedGeometry,
    widenedAnchor,
    viewAsModelGeometry,
    screenAsModelGeometry,
    modelAsViewGeometry,
    screenAsViewGeometry,
    modelAsScreenGeometry,
    viewAsScreenGeometry,
    viewAsModelFixed,
    screenAsModelFixed,
    modelAsViewFloating,
    screenAsViewFloating,
    modelAsScreenAnchor,
    viewAsScreenAnchor,
    widenedGeometryAlias,
    widenedFixedAlias,
    widenedAnchorAlias,
  }
}

function genericTerminalContracts<Space extends CoordinateSpace>(
  value: Point<Space>,
  bounds: Rect<Space>,
): {
  geometry: TerminalGeometry<Space>
  center: Point<Space>
  anchor: AnchorBinding<Space>
  fixed: FixedBinding<Space>
  floating: FloatingBinding<Space>
} {
  const geometry = terminalGeometry(bounds, 'rectangle')
  return {
    geometry,
    center: routingBoundsCenter(geometry),
    anchor: anchorBinding(value),
    fixed: fixedBinding<Space>('fixed', constraint),
    floating: floatingBinding<Space>('floating'),
  }
}
