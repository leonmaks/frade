import { point, type ModelPoint } from '../../../../src/routing/model'

const modelPoint: ModelPoint = point(3, 4)
void modelPoint

// @ts-expect-error The fixture is compiled only when *.type-test.ts discovery is active.
modelPoint.x = 5
