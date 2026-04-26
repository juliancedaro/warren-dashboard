import { useMemo } from 'react'
import { DASH_COUNTRY_OPTIONS } from '../constants'
import type { AdrRangeId, DashboardRow, DashboardSummary, HeatmapPayload, MinCapOption } from '../types'
import { matchesAdrRange, matchesSelection } from '../utils/filters'
import { buildHeatmapSectorStrip } from '../utils/heatmap'

function canonicalCountry(value?: string | null): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const upper = raw.toUpperCase()
  if (upper === 'AR' || upper === 'ARGENTINA') return 'argentina'
  if (upper === 'BR' || upper === 'BRAZIL' || upper === 'BRASIL') return 'brasil'
  if (
    upper === 'US' ||
    upper === 'UNITED STATES' ||
    upper === 'UNITED STATES OF AMERICA' ||
    upper === 'USA'
  )
    return 'USA'
  if (upper === 'UK' || upper === 'UNITED KINGDOM' || upper === 'GB') return 'GB'
  if (
    upper === 'CN' ||
    upper === 'CHN' ||
    upper === 'CHINA' ||
    upper === "PEOPLE'S REPUBLIC OF CHINA" ||
    upper === 'PRC'
  )
    return 'China'
  return null
}

export function useDashboardDerived(params: {
  payload: { rows: DashboardRow[] } | null
  heatmap: HeatmapPayload | null
  countries: string[]
  indexTags: string[]
  sectors: string[]
  industries: string[]
  minCapId: string
  adrRange: AdrRangeId
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
    rows = rows.filter((row) => matchesSelection(canonicalCountry(row.country), countries))
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

  const countriesOptions = useMemo(() => [...DASH_COUNTRY_OPTIONS], [])

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
    cells = cells.filter((cell) => matchesSelection(canonicalCountry(cell.country), countries))
    cells = cells.filter((cell) => matchesSelection(cell.indexTag, indexTags))
    cells = cells.filter((cell) => matchesAdrRange(cell.adrPct, adrRange))
    cells = cells.filter((cell) => matchesSelection(cell.sector, sectors))
    cells = cells.filter((cell) => matchesSelection(cell.industry, industries))
    return cells
  }, [heatmap, symbolSet, minCap, countries, indexTags, adrRange, sectors, industries])

  const heatmapSectors = useMemo(
    () => buildHeatmapSectorStrip(heatmapCells, sectors.length === 1 ? sectors[0] : 'all'),
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
    heatmapSectors,
    minCap,
  }
}