import type { HeatmapCell, HeatmapSectorColumn, TreemapGroup, TreemapLeaf } from '../types'

const TOP_PER_SECTOR = 12

function heatChangeFill(pct?: number | null): string {
  const p = Number(pct)
  if (!Number.isFinite(p)) return '#303540'
  const mag = Math.min(1, Math.abs(p) / 3)
  if (Math.abs(p) < 0.08) return '#3f4656'
  if (p >= 0) {
    const g = Math.round(108 + mag * 118)
    const r = Math.round(16 + mag * 18)
    const b = Math.round(30 + mag * 14)
    return `rgb(${Math.min(40, r)}, ${Math.min(226, g)}, ${Math.min(46, b)})`
  }
  const r = Math.round(132 + mag * 110)
  const g = Math.round(22 + mag * 16)
  const b = Math.round(36 + mag * 14)
  return `rgb(${Math.min(242, r)}, ${Math.min(44, g)}, ${Math.min(54, b)})`
}

export function buildHeatmapSectorStrip(
  cells: HeatmapCell[] = [],
  selectedSector: string,
): HeatmapSectorColumn[] {
  if (!cells.length) return []
  const rows = selectedSector && selectedSector !== 'all'
    ? cells.filter((cell) => cell.sector === selectedSector)
    : cells

  const bySector = new Map<string, HeatmapCell[]>()
  for (const cell of rows) {
    const sector = cell.sector || 'Otros'
    if (!bySector.has(sector)) bySector.set(sector, [])
    bySector.get(sector)!.push(cell)
  }

  const sumMcap = (leaves: TreemapLeaf[]) => leaves.reduce((s, t) => s + t.size, 0)

  const columns: HeatmapSectorColumn[] = [...bySector.entries()].map(([name, list]) => {
    const top = [...list]
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, TOP_PER_SECTOR)
    const leaves: TreemapLeaf[] = top.map((cell) => {
      const sector = cell.sector || 'Otros'
      const industry = cell.industry || sector
      return {
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
      }
    })
    return { name, leaves }
  })

  return columns
    .filter((c) => c.leaves.length > 0)
    .sort((a, b) => sumMcap(b.leaves) - sumMcap(a.leaves))
}

function sumSubtree(node: TreemapGroup | TreemapLeaf): number {
  if ('children' in node && node.children?.length) {
    return node.children.reduce(
      (s, ch) => s + sumSubtree(ch as TreemapGroup | TreemapLeaf),
      0,
    )
  }
  return Number((node as TreemapLeaf).size ?? 0)
}

/**
 * Estilo TradingView: sector GICS -> industria -> tickers.
 * Pensado para datos crudos del API (sin pasar por filtros del tablero).
 */
export function buildHeatmapTreemapTv(cells: HeatmapCell[] = []): TreemapGroup[] {
  if (!cells.length) return []

  const bySector = new Map<string, HeatmapCell[]>()
  for (const cell of cells) {
    const sector = cell.sector || 'Otros'
    if (!bySector.has(sector)) bySector.set(sector, [])
    bySector.get(sector)!.push(cell)
  }

  return [...bySector.entries()]
    .map(([sectorName, sectorCells]) => {
      const byIndustry = new Map<string, HeatmapCell[]>()
      for (const cell of sectorCells) {
        const industry = cell.industry || 'Otros'
        if (!byIndustry.has(industry)) byIndustry.set(industry, [])
        byIndustry.get(industry)!.push(cell)
      }

      const children: TreemapGroup[] = [...byIndustry.entries()]
        .map(([industryName, list]) => {
          const sorted = [...list].sort((a, b) => b.marketCap - a.marketCap)
          const leaves: TreemapLeaf[] = sorted.map((cell) => {
            const sector = cell.sector || 'Otros'
            const industry = cell.industry || industryName
            return {
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
            }
          })
          return { name: industryName, children: leaves }
        })
        .filter((group) => group.children.length > 0)
        .sort((a, b) => sumSubtree(b) - sumSubtree(a))

      return { name: sectorName, children }
    })
    .filter((g) => g.children.length > 0)
    .sort((a, b) => sumSubtree(b) - sumSubtree(a))
}
