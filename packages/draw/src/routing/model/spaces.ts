declare const coordinateSpace: unique symbol

export interface CoordinateSpace<Tag extends string = string> {
  readonly [coordinateSpace]: Tag
}

export type ModelSpace = CoordinateSpace<'model'>
export type ViewSpace = CoordinateSpace<'view'>
export type ScreenSpace = CoordinateSpace<'screen'>
