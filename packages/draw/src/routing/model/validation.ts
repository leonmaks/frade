export function assertFiniteNumber(operation: string, field: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${operation}: ${field} must be finite; received ${String(value)}`)
  }
}

export function assertNonNegativeNumber(operation: string, field: string, value: number): void {
  assertFiniteNumber(operation, field, value)
  if (value < 0) {
    throw new RangeError(`${operation}: ${field} must be non-negative; received ${String(value)}`)
  }
}
