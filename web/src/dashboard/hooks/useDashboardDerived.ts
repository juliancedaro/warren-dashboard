import { useMemo } from 'react'
import type { DashboardRow, DashboardSummary, HeatmapPayload, MinCapOption } from '../types'
import { buildHeatmapTreemapData } from '../utils/heatmap'

function matchesAdrRange(value: number | null | undefined, range: 'all' | 'lt2' | '2to4' | 'gt4') {
  const adr = Number(value ?? 0)
  if (range === 'lt2') return adr < 2
  if (range === '2to4') return adr >= 2 && adr <= 4
  if (range === 'gt4') return adr > 4
  return true
}

function matchesSelection(value: string | null | undefined, selected: string[]) {
  if (!selected.length) return true
  return selected.includes(String(value ?? ''))
}

export function useDashboardDerived(params: {
  payload: { rows: DashboardRow[] } | null
  heatmap: HeatmapPayload | null
  countries: string[]
  indexTags: string[]
  sectors: string[]
  industries: string[]
  minCapId: string
  adrRange: 'all' | 'lt2' | '2to4' | 'gt4'
  excludeNear52w: boolean
  unusualThresholdPct: number
  unusualTopN: number
  minCapOptions: MinCapOption[]
  symbols?: string[] | null
}) {
  const {
    payload,
    heatmap,
    countries,
    indexTags,
    sectors,
    industries,
    minCapId,
    adrRange,
    excludeNear52w,
    unusualThresholdPct,
    unusualTopN,
    minCapOptions,
    symbols,
  } = params

  const minCap = minCapOptions.find((item) => item.id === minCapId)?.min ?? 0
  const symbolSet = useMemo(() => (symbols?.length ? new Set(symbols) : null), [symbols])

  const baseRows = useMemo(() => {
    let rows = payload?.rows ?? []
    if (symbolSet) rows = rows.filter((row) => symbolSet.has(row.symbol))
    rows = rows.filter((row) => row.marketCap >= minCap)
    rows = rows.filter((row) => matchesSelection(row.country, countries))
    rows = rows.filter((row) => matchesSelection(row.indexTag, indexTags))
    rows = rows.filter((row) => matchesAdrRange(row.adrPct, adrRange))
    if (excludeNear52w) rows = rows.filter((row) => !row.near52wHigh)
    return rows
  }, [payload, symbolSet, minCap, countries, indexTags, adrRange, excludeNear52w])

  const filteredRows = useMemo(() => {
    let rows = baseRows
    rows = rows.filter((row) => matchesSelection(row.sector, sectors))
    rows = rows.filter((row) => matchesSelection(row.industry, industries))
    return rows
  }, [baseRows, sectors, industries])

  const countriesOptions = useMemo(() => {
    const set = new Set(baseRows.map((row) => row.country).filter(Boolean) as string[])
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [baseRows])

  const indexTagOptions = useMemo(() => {
    const set = new Set(baseRows.map((row) => row.indexTag).filter(Boolean) as string[])
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [baseRows])

  const sectorOptions = useMemo(() => {
    const set = new Set(baseRows.map((row) => row.sector).filter(Boolean) as string[])
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [baseRows])

  const industryOptions = useMemo(() => {
    let rows = baseRows
    if (sectors.length) {
      rows = rows.filter((row) => matchesSelection(row.sector, sectors))
    }
    const set = new Set(rows.map((row) => row.industry).filter(Boolean) as string[])
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [baseRows, sectors])

  const chartData = useMemo(
    () => filteredRows.map((row) => ({ ...row, bubbleSize: Math.sqrt(Math.max(row.marketCap, 1)) })),
    [filteredRows]
  )

  const unusualVolBars = useMemo(
    () =>
      filteredRows
        .map((row) => ({ ...row, volDevPct5: row.volDevPct5 ?? 0 }))
        .filter((row) => (row.volDevPct5 ?? 0) >= unusualThresholdPct)
        .sort((a, b) => (b.volDevPct5 ?? 0) - (a.volDevPct5 ?? 0))
        .slice(0, unusualTopN),
    [filteredRows, unusualThresholdPct, unusualTopN]
  )

  const rsiRsData = useMemo(() => filteredRows.filter((row) => row.rsi14 != null), [filteredRows])

  const summary = useMemo<DashboardSummary | null>(() => {
    if (!filteredRows.length) return null
    return {
      activeTickers: filteredRows.length,
      aboveEma20: filteredRows.filter((row) => Boolean(row.aboveEma20)).length,
      aboveEma50: filteredRows.filter((row) => Boolean(row.aboveEma50)).length,
      aboveEma200: filteredRows.filter((row) => Boolean(row.aboveEma200)).length,
      rsScoreGt70: filteredRows.filter((row) => (row.rsScore ?? 0) >= 70).length,
      unusualVolToday: filteredRows.filter((row) => Boolean(row.unusualVol) || (row.volDevPct5 ?? 0) >= 50).length,
      qualityCandidates: filteredRows.filter((row) => (row.warrenScore ?? 0) >= 6).length,
    }
  }, [filteredRows])

  const heatmapCells = useMemo(() => {
    let cells = heatmap?.cells ?? []
    if (symbolSet) cells = cells.filter((cell) => symbolSet.has(cell.symbol))
    cells = cells.filter((cell) => cell.marketCap >= minCap)
    cells = cells.filter((cell) => matchesSelection(cell.country, countries))
    cells = cells.filter((cell) => matchesSelection(cell.indexTag, indexTags))
    cells = cells.filter((cell) => matchesAdrRange(cell.adrPct, adrRange))
    cells = cells.filter((cell) => matchesSelection(cell.sector, sectors))
    cells = cells.filter((cell) => matchesSelection(cell.industry, industries))
    return cells
  }, [heatmap, symbolSet, minCap, countries, indexTags, adrRange, sectors, industries])

  const heatmapTreemapData = useMemo(
    () => buildHeatmapTreemapData(heatmapCells, sectors.length === 1 ? sectors[0] : 'all'),
    [heatmapCells, sectors]
  )

  return {
    countries: countriesOptions,
    indexTags: indexTagOptions,
    sectors: sectorOptions,
    industries: industryOptions,
    filteredRows,
    chartData,
    unusualVolBars,
    rsiRsData,
    summary,
    heatmapTreemapData,
    minCap,
  }
}