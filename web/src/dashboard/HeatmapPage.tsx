import { useCallback, useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts'
import { HeatmapDetailTooltip } from './components/HeatmapDetailTooltip'
import { useApiFetch } from './hooks/useApiFetch'
import { formatUsd } from './utils/formatters'
import { buildHeatmapTreemapTv } from './utils/heatmap'
import type { HeatmapPayload, TreemapGroup, TreemapLeaf } from './types'

type Node = TreemapGroup | TreemapLeaf

function isGroup(n: Node): n is TreemapGroup {
  return 'children' in n && Array.isArray(n.children) && n.children.length > 0
}

function treemapSubtreeMcap(n: Node): number {
  if (isGroup(n)) {
    return n.children.reduce((s, c) => s + treemapSubtreeMcap(c as Node), 0)
  }
  return Number((n as TreemapLeaf).size ?? 0)
}

function isIndustryGroupNode(children?: readonly unknown[]): boolean {
  if (!Array.isArray(children) || !children.length) return false
  return children.every((child) => child != null && typeof child === 'object' && !('children' in (child as Record<string, unknown>)))
}

function formatChangePercent(value?: number): string {
  const change = Number(value ?? 0)
  if (!Number.isFinite(change)) return '—'
  return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
}

function truncateLabel(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function nestTreemapCellContent(
  props: Record<string, unknown>,
  hoveredIndustry: string | null,
  onIndustryHover: (industry: string | null) => void,
) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name,
    children,
    fill,
    depth = 0,
    logoUrl,
    symbol,
    industry,
    fullName,
    changePct,
  } = props as {
    x?: number
    y?: number
    width?: number
    height?: number
    name?: string
    children?: readonly unknown[]
    fill?: string
    depth?: number
    logoUrl?: string
    symbol?: string
    industry?: string
    fullName?: string
    changePct?: number
  }

  const d = depth
  const isLeaf = !children?.length
  const w = Math.max(0, width)
  const h = Math.max(0, height)
  const area = w * h
  if (w < 2 || h < 2) return null

  if (!isLeaf) {
    const label = String(name || '')
    const isIndustry = isIndustryGroupNode(children)
    const isHovered = isIndustry && hoveredIndustry === label
    const showIndustryHeader = isIndustry && w > 84 && h > 20
    const groupStroke = isIndustry
      ? (isHovered ? '#2f7df6' : 'rgba(255,255,255,0.18)')
      : '#05060a'
    const groupStrokeWidth = isIndustry ? (isHovered ? 2.4 : 1.5) : 5.2
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={isIndustry ? 'rgba(8, 11, 16, 0.62)' : 'rgba(2, 6, 12, 0.45)'}
          stroke={groupStroke}
          strokeWidth={groupStrokeWidth}
          onMouseEnter={isIndustry ? () => onIndustryHover(label) : undefined}
        />
        {showIndustryHeader ? (
          <g>
            <rect
              x={x + 1}
              y={y + 1}
              width={Math.max(0, w - 2)}
              height={16}
              fill={isHovered ? '#2f7df6' : 'rgba(15, 23, 42, 0.9)'}
              onMouseEnter={() => onIndustryHover(label)}
            />
            <text
              x={x + 5}
              y={y + 11.8}
              fill="rgba(248,250,252,0.95)"
              fontSize={7.4}
              fontWeight={700}
            >
              {label.length > 20 ? `${label.slice(0, 19)}…` : label}
            </text>
          </g>
        ) : null}
      </g>
    )
  }

  const bg = fill || '#1a1d26'
  const sym = String(symbol || name || '')
  const clipId = `c-${d}-${String(sym).replace(/[^A-Za-z0-9]/g, 'x')}-${String(Math.floor((x + y) * 1e2))}`
  const showXL = area >= 11800
  const showM = area >= 3600
  const showS = area >= 1350
  const showLogo = showXL || (showM && w > 54 && h > 44)
  const showName = showXL && (fullName || name)
  const ch = changePct == null || !Number.isFinite(Number(changePct)) ? 0 : Number(changePct)
  const pct = formatChangePercent(ch)
  const r = showXL ? 21 : 12
  const logoLeft = x + 4
  const cy = y + 4 + r
  const textLeft = showLogo ? logoLeft + 2 * r + 6 : x + 4
  const companyLabel = String(fullName || name || sym || 'empresa')
  const marketCapLabel = Number.isFinite(Number((props as { marketCap?: number }).marketCap))
    ? formatUsd(Number((props as { marketCap?: number }).marketCap))
    : null
  const leafAriaLabel = [
    companyLabel,
    `Ticker ${sym}`,
    `Variacion ${pct}`,
    marketCapLabel ? `Capitalizacion ${marketCapLabel}` : null,
  ].filter(Boolean).join('. ')

  return (
    <g
      style={{ cursor: 'default' }}
      role="img"
      aria-label={leafAriaLabel}
      onMouseEnter={() => onIndustryHover(industry ?? null)}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={bg}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={0.7}
      />
      {showLogo && w > 40 && h > 34 ? (
        <g>
          <defs>
            <clipPath id={clipId}>
              <circle cx={logoLeft + r} cy={cy} r={r} />
            </clipPath>
          </defs>
          {logoUrl ? (
            <image
              href={logoUrl}
              aria-label={`Logo de ${companyLabel}`}
              x={logoLeft}
              y={y + 4}
              width={2 * r}
              height={2 * r}
              clipPath={`url(#${clipId})`}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <g>
              <circle cx={logoLeft + r} cy={cy} r={r} fill="rgba(0,0,0,0.3)" />
              <text
                x={logoLeft + r}
                y={cy + 4}
                textAnchor="middle"
                fill="#f8fafc"
                fontSize={Math.max(6, r * 0.85)}
                fontWeight={800}
              >
                {String(sym).slice(0, 2).toUpperCase()}
              </text>
            </g>
          )}
        </g>
      ) : null}
      {(showS || showM || showXL) ? (
        <text
          x={showLogo ? textLeft : x + 4}
          y={showXL ? y + 16 : showM ? y + 14 : y + 11}
          fill="#f8fafc"
          fontSize={showXL ? 13 : showM ? 9 : 7}
          fontWeight={700}
        >
          {showS && !showM ? truncateLabel(sym, 5) : sym}
        </text>
      ) : null}
      {showName && fullName ? (
        <text
          x={textLeft}
          y={y + 31}
          fill="rgba(248,250,252,0.68)"
          fontSize={7}
        >
          {truncateLabel(String(fullName), 16)}
        </text>
      ) : null}
      {(showM || showXL) ? (
        <text
          x={x + 4}
          y={y + h - 5}
          fill="rgba(255,255,255,0.94)"
          fontSize={showXL ? 8 : 7}
          fontWeight={700}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {pct}
        </text>
      ) : null}
    </g>
  )
}

export function HeatmapPage() {
  const fetchJson = useApiFetch()
  const [heatmap, setHeatmap] = useState<HeatmapPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredIndustry, setHoveredIndustry] = useState<string | null>(null)

  const loadHeatmap = useCallback(async (refresh = false) => {
    const q = refresh ? '?refresh=1' : ''
    setError(null)
    setLoading(true)
    try {
      const body = await fetchJson<HeatmapPayload>(`/dashboard/heatmap${q}`)
      setHeatmap(body)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setHeatmap(null)
    } finally {
      setLoading(false)
    }
  }, [fetchJson])

  useEffect(() => {
    void loadHeatmap(false)
  }, [loadHeatmap])

  const handleRefresh = useCallback(() => {
    void loadHeatmap(true)
  }, [loadHeatmap])

  const handleTreemapLeave = useCallback(() => {
    setHoveredIndustry(null)
  }, [])

  const renderTreemapContent = useCallback((nodeProps: Record<string, unknown>) => (
    nestTreemapCellContent(nodeProps, hoveredIndustry, setHoveredIndustry)
  ), [hoveredIndustry])

  const sorted = useMemo(() => {
    const tree = buildHeatmapTreemapTv(heatmap?.cells ?? [])
    return [...tree].sort((a, b) => treemapSubtreeMcap(b) - treemapSubtreeMcap(a))
  }, [heatmap])

  return (
    <div className="heat-tv">
      <header className="heat-tv-topbar" aria-label="Herramientas del mapa">
        <h1 className="heat-tv-title">Indice S&amp;P 500</h1>
        <div className="heat-tv-topbar-r">
          <button
            type="button"
            className="dash-btn"
            disabled={loading || !heatmap}
            onClick={handleRefresh}
            aria-label="Actualizar datos del heatmap"
            title="Actualizar heatmap"
          >
            Actualizar
          </button>
        </div>
      </header>

      {loading && !heatmap ? (
        <div className="heat-tv-canvas-skel" aria-hidden="true" />
      ) : error ? (
        <div className="heat-tv-canvas-err dash-panel-placeholder">
          <div className="heat-tv-state-card" role="alert" aria-live="assertive">
            <p className="dash-muted heat-tv-state-title">No se pudo cargar el heatmap.</p>
            <p className="dash-muted heat-tv-state-detail">{error}</p>
            <button type="button" className="dash-btn" onClick={handleRefresh} aria-label="Reintentar carga del heatmap">
              Reintentar
            </button>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="heat-tv-canvas-err">
          <div className="heat-tv-state-card" aria-live="polite">
            <p className="dash-muted heat-tv-state-title">Todavia no hay datos para renderizar.</p>
            <p className="dash-muted heat-tv-state-detail">Revisa snapshots/filtros y luego intenta actualizar.</p>
            <button type="button" className="dash-btn" onClick={handleRefresh} aria-label="Intentar cargar nuevamente el heatmap">
              Intentar de nuevo
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="heat-tv-sector-grid" role="list" aria-label="Heatmap por sector">
            {sorted.map((sector) => (
              <section
                key={sector.name}
                className="heat-tv-sector-panel"
                role="listitem"
                aria-label={`Sector ${sector.name}`}
              >
                <header className="heat-tv-sector-panel-head">
                  <span className="heat-tv-sector-panel-title">
                    {sector.name}
                    <span className="heat-tv-sector-panel-chev" aria-hidden="true">
                      ›
                    </span>
                  </span>
                </header>
                <div className="heat-tv-sector-panel-chart">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <Treemap
                      type="flat"
                      data={
                        sector.children as unknown as ReadonlyArray<Record<string, unknown>>
                      }
                      dataKey="size"
                      nameKey="name"
                      stroke="rgba(255,255,255,0.12)"
                      isAnimationActive={false}
                      content={renderTreemapContent}
                      onMouseLeave={handleTreemapLeave}
                    >
                      <Tooltip
                        content={<HeatmapDetailTooltip />}
                        cursor={false}
                        wrapperStyle={{ pointerEvents: 'none', zIndex: 2200 }}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
