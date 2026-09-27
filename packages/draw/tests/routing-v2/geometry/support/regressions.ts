export const LARGE_FINITE_QUANTIZATION_COUNTEREXAMPLE = 100_000_000_000_000.02
export const LARGE_EXACT_GRID_COUNTEREXAMPLE = 450_359_962_737_049.7

export const CUMULATIVE_EPSILON_DRIFT_COUNTEREXAMPLE = [
  { x: 0, y: 0 },
  { x: 1, y: 0.75e-6 },
  { x: 2, y: 1.5e-6 },
] as const

export const SAFE_DOMAIN_GENERATOR_COUNTEREXAMPLE = {
  seed: 0xfad001,
  path: 'translation-orientation-distance-normalization/3060',
  start: { x: -92_086, y: -999_685 },
  end: { x: -92_906, y: -1_000_194 },
  delta: { x: 864_698, y: -223_577 },
} as const
