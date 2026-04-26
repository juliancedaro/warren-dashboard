import type { AdrRangeId } from '../types'

export function matchesAdrRange(value: number | null | undefined, range: AdrRangeId): boolean {
  const adr = Number(value ?? 0)
  if (range === 'lt2') return adr < 2
  if (range === '2to4') return adr >= 2 && adr <= 4
  if (range === 'gt4') return adr > 4
  return true
}

export function matchesSelection(value: string | null | undefined, selected: string[]): boolean {
  if (!selected.length) return true
  return selected.includes(String(value ?? ''))
}
