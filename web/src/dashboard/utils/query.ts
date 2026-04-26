import type { AdrRangeId } from '../types'

/**
 * Clave estable para comparar objetos `query` por valor (no por referencia).
 * Útil en hooks donde `useMemo([query])` se dispararía en cada render si el padre pasa un literal nuevo.
 */
export function stableQueryKey(
  query: Record<string, string | number | boolean | string[] | null | undefined>,
): string {
  const keys = Object.keys(query).sort()
  const parts: string[] = []
  for (const key of keys) {
    const value = query[key as keyof typeof query]
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      if (!value.length) continue
      parts.push(`${key}=[${[...value].map(String).sort().join(',')}]`)
    } else {
      parts.push(`${key}=${String(value)}`)
    }
  }
  return parts.join('|')
}

export function adrQueryBounds(range: AdrRangeId): { adrMin?: number; adrMax?: number } {
  if (range === 'lt2') return { adrMax: 2 }
  if (range === '2to4') return { adrMin: 2, adrMax: 4 }
  if (range === 'gt4') return { adrMin: 4 }
  return {}
}

export function buildQueryString(input: Record<string, string | number | boolean | Array<string> | null | undefined>): string {
  const params = new URLSearchParams()
  Object.entries(input).forEach(([key, value]) => {
    if (value == null || value === '') return
    if (Array.isArray(value)) {
      if (!value.length) return
      params.set(key, value.join(','))
      return
    }
    params.set(key, String(value))
  })
  return params.toString()
}
