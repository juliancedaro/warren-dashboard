import { useMemo } from 'react'
import { DASH_COUNTRY_OPTIONS } from '../constants'
import type { DashboardRow, DashboardSummary } from '../types'
import { matchesSelection } from '../utils/filters'

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
  countries: string[]
  indexTags: string[]
  sectors: string[]
  industries: string[]
  minCapMin: number
  minCapMax: number
  adrMin: number
  adrMax: number
  excludeNear52w: boolean
  unusualThresholdPct: number
  unusualTopN: number
  symbols?: string[] | null
}) {
  const {
    payload,
    countries,
    indexTags,
    sectors,
    industries,
    minCapMin,
    minCapMax,
    adrMin,
    adrMax,
    excludeNear52w,
    unusualThresholdPct,
    unusualTopN,
    symbols,
  } = params

  const minCap = Number.isFinite(minCapMin) ? Math.max(0, minCapMin) : 0
  const maxCap = Number.isFinite(minCapMax) ? Math.max(minCap, minCapMax) : Number.POSITIVE_INFINITY
  const adrLo = Number.isFinite(adrMin) ? adrMin : 0
  const adrHi = Number.isFinite(adrMax) ? Math.max(adrLo, adrMax) : Number.POSITIVE_INFINITY
  const symbolSet = useMemo(() => (symbols?.length ? new Set(symbols) : null), [symbols])

  const baseRows = useMemo(() => {
    let rows = payload?.rows ?? []
    if (symbolSet) rows = rows.filter((row) => symbolSet.has(row.symbol))
    rows = rows.filter((row) => row.marketCap >= minCap && row.marketCap <= maxCap)
    rows = rows.filter((row) => matchesSelection(canonicalCountry(row.country), countries))
    rows = rows.filter((row) => matchesSelection(row.indexTag, indexTags))
    rows = rows.filter((row) => {
      const adr = Number(row.adrPct ?? 0)
      return adr >= adrLo && adr <= adrHi
    })
    if (excludeNear52w) rows = rows.filter((row) => !row.near52wHigh)
    return rows
  }, [payload, symbolSet, minCap, maxCap, countries, indexTags, adrLo, adrHi, excludeNear52w])

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
    if (!payload?.rows) return null
    return {
      activeTickers: filteredRows.length,
      aboveEma20: filteredRows.filter((row) => Boolean(row.aboveEma20)).length,
      aboveEma50: filteredRows.filter((row) => Boolean(row.aboveEma50)).length,
      aboveEma200: filteredRows.filter((row) => Boolean(row.aboveEma200)).length,
      rsScoreGt70: filteredRows.filter((row) => (row.rsScore ?? 0) >= 70).length,
      unusualVolToday: filteredRows.filter((row) => Boolean(row.unusualVol) || (row.volDevPct5 ?? 0) >= 50).length,
      qualityCandidates: filteredRows.filter((row) => (row.warrenScore ?? 0) >= 6).length,
    }
  }, [payload, filteredRows])

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
    minCap,
  }
}