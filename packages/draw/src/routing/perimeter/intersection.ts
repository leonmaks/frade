import { type CoordinateSpace, type Point } from '../model'
import { assertValidPerimeterGeometry, type PerimeterGeometry } from './contracts'
import { ellipsePerimeter } from './ellipse'
import { rectanglePerimeter } from './rectangle'

export function perimeterIntersection<Space extends CoordinateSpace>(
  geometry: PerimeterGeometry<Space>,
  toward: Point<NoInfer<Space>>,
  orthogonal: boolean,
): Point<Space> {
  assertValidPerimeterGeometry('perimeterIntersection', 'geometry', geometry)
  switch (geometry.kind) {
    case 'rectangle':
      return rectanglePerimeter(geometry.bounds, toward, orthogonal)
    case 'ellipse':
      return ellipsePerimeter(geometry.bounds, toward, orthogonal)
    default:
      throw new TypeError('perimeterIntersection: geometry.kind is invalid')
  }
}
