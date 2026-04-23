import type { HeatmapCell, TreemapGroup } from '../types'

function heatChangeFill(pct?: number | null): string {
  const p = Number(pct)
  if (!Number.isFinite(p)) return '#3f3f46'
  const mag = Math.min(1, Math.abs(p) / 4)
  if (p >= 0) {
    const g = Math.round(56 + mag * 96)
    return `rgb(16, ${Math.min(160, g + 24)}, 52)`
  }
  const r = Math.round(120 + mag * 100)
  return `rgb(${Math.min(220, r)}, 40, 40)`
}

export function buildHeatmapTreemapData(cells: HeatmapCell[] = [], selectedSector: string): TreemapGroup[] {
  if (!cells.length) return []
  const rows = selectedSector && selectedSector !== 'all'
    ? cells.filter((cell) => cell.sector === selectedSector)
    : cells

  const bySector = new Map<string, Map<string, any[]>>()

  for (const cell of rows) {
    const sector = cell.sector || 'Otros'
    const industry = cell.industry || sector
    if (!bySector.has(sector)) bySector.set(sector, new Map())
    const byIndustry = bySector.get(sector)!
    if (!byIndustry.has(industry)) byIndustry.set(industry, [])
    byIndustry.get(industry)!.push({
      name: cell.symbol,
      symbol: cell.symbol,
      size: Math.max(cell.marketCap ?? 0, 1e6),
      marketCap: cell.marketCap,
      changePct: cell.changePct,
      adrPct: cell.adrPct,
      fullName: cell.name,
      sector,
      industry,
      price: cell.price,
      website: cell.website,
      logoUrl: cell.logoUrl,
      fill: heatChangeFill(cell.changePct),
    })
  }

  return [...bySector.entries()].map(([sectorName, industries]) => ({
    name: sectorName,
    children: [...industries.entries()].map(([industryName, symbols]) => ({
      name: industryName,
      children: symbols,
    })),
  }))
}
