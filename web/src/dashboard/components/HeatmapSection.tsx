import { ResponsiveContainer, Tooltip, Treemap } from 'recharts'
import type { HeatmapPayload } from '../types'
import { formatPrice, formatUsd, heatLogoFallback } from '../utils/formatters'

function HeatmapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  if (point?.children) return null
  return (
    <div className="dash-tooltip dash-heatmap-tip">
      <div className="dash-heatmap-tip-head">
        {point.logoUrl ? (
          <img className="dash-heatmap-tip-logo" src={point.logoUrl} alt="" loading="lazy" />
        ) : (
          <span className="dash-heatmap-tip-fallback">{heatLogoFallback(point.symbol)}</span>
        )}
        <div>
          <strong>{point.symbol}</strong>
          <div>{point.fullName}</div>
        </div>
      </div>
      <div>{point.sector} · {point.industry}</div>
      <div>Var. día: {point.changePct >= 0 ? '+' : ''}{point.changePct != null ? Number(point.changePct).toFixed(2) : '—'}%</div>
      <div>Precio: ${point.price != null ? formatPrice(Number(point.price)) : '—'}</div>
      <div>ADR (20s): {point.adrPct != null ? Number(point.adrPct).toFixed(2) : '—'}%</div>
      <div>Cap: {formatUsd(point.marketCap ?? point.size ?? 0)}</div>
    </div>
  )
}

function TreemapCellContent(props: any) {
  const { x, y, width, height, name, children, fill, depth, logoUrl, symbol, fullName, changePct } = props
  const isLeaf = !children?.length
  const safeW = Math.max(0, width)
  const safeH = Math.max(0, height)
  const bg = isLeaf ? fill || '#1a1d26' : depth === 1 ? 'rgba(18, 20, 28, 0.98)' : 'rgba(22, 24, 34, 0.94)'
  const pad = depth === 1 ? 6 : 4
  const label = String(name || '')
  const showSector = !isLeaf && depth === 1 && safeW > 100 && safeH > 24
  const showIndustry = !isLeaf && depth > 1 && safeW > 80 && safeH > 18
  const showLogo = isLeaf && safeW > 54 && safeH > 54
  const showPct = isLeaf && safeW > 52 && safeH > 36
  const showName = isLeaf && safeW > 40 && safeH > 22
  const logoSize = Math.min(28, Math.max(14, Math.min(safeW, safeH) * 0.26))
  const labelText = safeW < 85 && label.length > 8 ? `${label.slice(0, 7)}…` : label

  return (
    <g>
      <rect x={x} y={y} width={safeW} height={safeH} rx={depth === 1 ? 3 : 1.5} ry={depth === 1 ? 3 : 1.5} fill={bg} stroke="rgba(255,255,255,0.12)" strokeWidth={depth === 1 ? 1.2 : 0.8} />
      {showSector ? <text x={x + pad} y={y + 15} fill="#d7dbe5" fontSize={11} fontWeight={700}>{labelText}</text> : null}
      {showIndustry ? <text x={x + pad} y={y + 13} fill="#a3abba" fontSize={10} fontWeight={600}>{labelText}</text> : null}
      {showLogo ? (logoUrl ? (
        <image href={logoUrl} x={x + pad} y={y + pad} width={logoSize} height={logoSize} preserveAspectRatio="xMidYMid meet" />
      ) : (
        <g>
          <circle cx={x + pad + logoSize / 2} cy={y + pad + logoSize / 2} r={logoSize / 2} fill="rgba(0,0,0,0.28)" />
          <text x={x + pad + logoSize / 2} y={y + pad + logoSize / 2 + 4} textAnchor="middle" fill="#f3f4f6" fontSize={Math.max(9, logoSize * 0.34)} fontWeight={800}>{heatLogoFallback(symbol || fullName || name)}</text>
        </g>
      )) : null}
      {showName ? <text x={x + pad} y={y + (showLogo ? logoSize + pad + 14 : safeH / 2 + 4)} fill="#f3f4f6" fontSize={safeW > 88 ? 12 : 10} fontWeight={700}>{safeW < 70 && String(symbol || name).length > 6 ? `${String(symbol || name).slice(0, 5)}…` : symbol || name}</text> : null}
      {showPct ? <text x={x + pad} y={y + safeH - 8} fill="rgba(255,255,255,0.88)" fontSize={10} fontWeight={600}>{Number(changePct) >= 0 ? '+' : ''}{Number(changePct).toFixed(2)}%</text> : null}
    </g>
  )
}

interface Props {
  heatmap: HeatmapPayload | null
  loading: boolean
  error: string | null
  heatmapTreemapData: any[]
}

export function HeatmapSection({ heatmap, loading, error, heatmapTreemapData }: Props) {
  return (
    <section className="dash-panel dash-heatmap-panel" aria-label="Mapa de calor">
      <div className="dash-panel-head">
        <h2>Mapa de calor sectorizado (sector → industria)</h2>
        <p className="dash-muted">
          Universo grande-cap (~50 tickers). Filtros: capitalización {heatmap?.filters ? `${formatUsd(heatmap.filters.minCapUsd)} – ${formatUsd(heatmap.filters.maxCapUsd)}` : '50B – 2T'}; ADR medio ({heatmap?.filters?.adrSessions ?? 20} ruedas) entre {heatmap?.filters ? `${heatmap.filters.minAdrPct}% y ${heatmap.filters.maxAdrPct}%` : '2% y 4%'}.
          Tamaño del bloque ~ market cap; color ~ variación del día. Agrupado por sector e industria, con logo cuando Yahoo trae website.
        </p>
      </div>
      {loading && !heatmap ? (
        <div className="dash-heatmap-chart dash-heatmap-skel" aria-hidden="true" />
      ) : error ? (
        <div className="dash-heatmap-chart dash-panel-placeholder"><p className="dash-muted" role="alert">Mapa de calor: {error}</p></div>
      ) : heatmapTreemapData.length === 0 ? (
        <div className="dash-heatmap-chart dash-panel-placeholder"><p className="dash-muted">No data to show.</p></div>
      ) : (
        <>
          <div className="dash-heatmap-chart">
            <ResponsiveContainer width="100%" height="100%" minHeight={380}>
              <Treemap type="flat" data={heatmapTreemapData} dataKey="size" nameKey="name" stroke="var(--dash-border)" aspectRatio={4 / 3} isAnimationActive={false} content={<TreemapCellContent />}>
                <Tooltip content={<HeatmapTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
          <p className="dash-foot">Coincidencias: {heatmap?.matched ?? 0} / escaneados: {heatmap?.scanned ?? 0} · Universo: {heatmap?.filters?.universeSize ?? '—'} tickers{heatmap?.skipped?.length ? <> · Omitidos/error: {heatmap.skipped.length}</> : null}</p>
        </>
      )}
    </section>
  )
}
