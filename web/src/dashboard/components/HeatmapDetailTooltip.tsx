import type { TreemapLeaf } from '../types'
import { formatPrice, formatUsd, heatLogoFallback } from '../utils/formatters'
import type { RechartsTooltipProps } from '../utils/rechartsTooltip'

function isBranch(p: unknown): p is { children?: { length?: number } } {
  return (
    p != null &&
    typeof p === 'object' &&
    'children' in p &&
    Array.isArray((p as { children: unknown[] }).children) &&
    (p as { children: { length: number } }).children.length > 0
  )
}

export function HeatmapDetailTooltip({ active, payload }: RechartsTooltipProps<unknown>) {
  if (!active || !payload?.length) return null
  const raw = payload[0].payload
  if (!raw || isBranch(raw)) return null
  const point = raw as TreemapLeaf
  const up = Number(point.changePct ?? 0) >= 0
  return (
    <div className="dash-tooltip dash-heatmap-tip heat-tv-tooltip">
      <div className="dash-heatmap-tip-head">
        {point.logoUrl ? (
          <img
            className="dash-heatmap-tip-logo"
            src={point.logoUrl}
            alt={`Logo de ${point.fullName || point.symbol}`}
            loading="lazy"
          />
        ) : (
          <span className="dash-heatmap-tip-fallback">{heatLogoFallback(point.symbol)}</span>
        )}
        <div>
          <strong>{point.symbol}</strong>
          <div>{point.fullName}</div>
        </div>
      </div>
      <div className="dash-heatmap-tip-line">
        {point.sector} · {point.industry}
      </div>
      <div className="dash-heatmap-tip-line">
        Precio: <strong>${point.price != null ? formatPrice(Number(point.price)) : '—'}</strong>
      </div>
      <div className="dash-heatmap-tip-line">Cap: {formatUsd(point.marketCap ?? point.size ?? 0)}</div>
      <div className="dash-heatmap-tip-line">
        ADR (20s): {point.adrPct != null ? Number(point.adrPct).toFixed(2) : '—'}%
      </div>
      <div className="dash-heatmap-tip-change" data-up={up ? '1' : '0'}>
        {up ? '▲' : '▼'} {up ? '+' : ''}
        {point.changePct != null ? Number(point.changePct).toFixed(2) : '—'}%
      </div>
    </div>
  )
}
