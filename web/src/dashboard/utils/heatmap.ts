import type { HeatmapCell, HeatmapSectorColumn, TreemapGroup, TreemapLeaf } from '../types'

const TOP_PER_SECTOR = 12

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
 * Estilo TradingView: **un solo subnivel** — sector GICS → tickers (sin industria en el árbol).
 * Pensado para datos **crudos del API** (sin pasar por filtros del tablero).
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
    .map(([sectorName, list]) => {
      const sorted = [...list].sort((a, b) => b.marketCap - a.marketCap)
      const children: TreemapLeaf[] = sorted.map((cell) => {
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
      return { name: sectorName, children }
    })
    .filter((g) => g.children.length > 0)
    .sort((a, b) => sumSubtree(b) - sumSubtree(a))
}
