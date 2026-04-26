import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts'
import { useDashboardData } from './DashboardDataContext'
import { HeatmapDetailTooltip } from './components/HeatmapDetailTooltip'
import { formatUsd } from './utils/formatters'
import { buildHeatmapTreemapTv } from './utils/heatmap'
import type { TreemapGroup, TreemapLeaf } from './types'

type Node = TreemapGroup | TreemapLeaf

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function isGroup(n: Node): n is TreemapGroup {
  return 'children' in n && Array.isArray(n.children) && n.children.length > 0
}

function treemapSubtreeMcap(n: Node): number {
  if (isGroup(n)) {
    return n.children.reduce((s, c) => s + treemapSubtreeMcap(c as Node), 0)
  }
  return Number((n as TreemapLeaf).size ?? 0)
}

function nestTreemapCellContent(props: Record<string, unknown>) {
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
    fullName?: string
    changePct?: number
  }

  const d = depth
  const isLeaf = !children?.length
  const w = Math.max(0, width)
  const h = Math.max(0, height)
  if (w < 3 || h < 3) return null

  if (!isLeaf) {
    const label = String(name || '')
    const show = w > 44 && h > 18
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={2}
          ry={2}
          fill="#0d1117"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={0.8}
        />
        {show ? (
          <g>
            <rect
              x={x}
              y={y}
              width={w}
              height={Math.min(20, h * 0.22)}
              fill="#1e3a5f"
              opacity={0.95}
            />
            <text
              x={x + 6}
              y={y + 14}
              fill="#e8eef7"
              fontSize={w < 100 ? 9 : 10}
              fontWeight={700}
            >
              {w < 80 && label.length > 12 ? `${label.slice(0, 11)}…` : label}
            </text>
            <text
              x={x + w - 6}
              y={y + 14}
              textAnchor="end"
              fill="rgba(226, 232, 255, 0.45)"
              fontSize={11}
            >
              ›
            </text>
          </g>
        ) : null}
      </g>
    )
  }

  const bg = fill || '#1a1d26'
  const sym = String(symbol || name || '')
  const clipId = `c-${d}-${String(sym).replace(/[^A-Za-z0-9]/g, 'x')}-${String(Math.floor((x + y) * 1e3))}`
  const r = clamp(Math.min(w, h) * 0.18, 8, 18)
  const showLogo = w > 32 && h > 28
  const showName = w > 56 && h > 40 && (fullName || name)
  const ch = changePct == null || !Number.isFinite(Number(changePct)) ? 0 : Number(changePct)
  const pct = `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`
  const logoLeft = x + 4
  const cy = y + 4 + r
  const textLeft = showLogo ? logoLeft + 2 * r + 4 : x + 4

  return (
    <g style={{ cursor: 'default' }} role="presentation">
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={1.5}
        ry={1.5}
        fill={bg}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={0.6}
      />
      {showLogo ? (
        <g>
          <defs>
            <clipPath id={clipId}>
              <circle cx={logoLeft + r} cy={cy} r={r} />
            </clipPath>
          </defs>
          {logoUrl ? (
            <image
              href={logoUrl}
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
      <text
        x={w > 48 ? textLeft : x + 3}
        y={h > 36 ? y + (showLogo ? 14 : 11) : y + h * 0.5}
        fill={Math.abs(ch) < 0.2 && w > 60 ? '#0a0a0a' : '#f8fafc'}
        fontSize={w > 90 && h > 50 ? 12 : 9}
        fontWeight={800}
      >
        {w < 50 && sym.length > 4 ? `${sym.slice(0, 3)}…` : sym}
      </text>
      {showName && fullName ? (
        <text
          x={w > 56 ? textLeft : x + 3}
          y={y + (showLogo ? 26 : 20)}
          fill="rgba(248,250,252,0.72)"
          fontSize={7}
        >
          {String(fullName).length > 18 && w < 120
            ? `${String(fullName).slice(0, 16)}…`
            : fullName}
        </text>
      ) : null}
      {h > 32 ? (
        <text
          x={x + 4}
          y={y + h - 4}
          fill="rgba(255,255,255,0.92)"
          fontSize={8}
          fontWeight={600}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {pct}
        </text>
      ) : null}
    </g>
  )
}

const LEGEND = [
  { label: '-3%', c: 'rgb(180, 40, 50)' },
  { label: '-1%', c: 'rgb(120, 50, 55)' },
  { label: '0', c: '#5c6370' },
  { label: '+1%', c: 'rgb(20, 120, 55)' },
  { label: '+3%', c: 'rgb(16, 100, 45)' },
]

export function HeatmapPage() {
  const { bootstrap } = useDashboardData()
  const { heatmap, heatmapLoading: loading, heatmapErr: error } = bootstrap

  const sorted = useMemo(() => {
    const tree = buildHeatmapTreemapTv(heatmap?.cells ?? [])
    return [...tree].sort((a, b) => treemapSubtreeMcap(b) - treemapSubtreeMcap(a))
  }, [heatmap])

  return (
    <div className="heat-tv">
      <header className="heat-tv-topbar" aria-label="Herramientas del mapa">
        <div className="heat-tv-topbar-l">
          <h1 className="heat-tv-title">Stock heatmap (universo S&amp;P — snapshots)</h1>
          <p className="heat-tv-sub">
            Misma lógica que un mapa tipo TradingView: <strong>sin</strong> filtros del tablero; criterios en el API
            (universo, cap, ADR).
          </p>
          <div className="heat-tv-badges" role="group" aria-label="Cómo se lee el mapa">
            <span className="heat-tv-badge">Tamaño: <strong>Market cap</strong></span>
            <span className="heat-tv-badge">Color: <strong>Var. día, %</strong></span>
            <span className="heat-tv-badge">Agrupar: <strong>Sector</strong> (sin subniveles)</span>
          </div>
        </div>
        <div className="heat-tv-topbar-r">
          <p className="heat-tv-cap">
            API: {heatmap?.filters ? `cap ${formatUsd(heatmap.filters.minCapUsd)} – ${formatUsd(heatmap.filters.maxCapUsd)}` : '—'}
            {' · '}
            <Link className="heat-tv-link" to="/">
              Volver al tablero
            </Link>
          </p>
          <button
            type="button"
            className="dash-btn"
            disabled={loading || !heatmap}
            onClick={() => bootstrap.load(true)}
          >
            Actualizar
          </button>
        </div>
      </header>

      {loading && !heatmap ? (
        <div className="heat-tv-canvas-skel" aria-hidden="true" />
      ) : error ? (
        <div className="heat-tv-canvas-err dash-panel-placeholder">
          <p className="dash-muted" role="alert">
            {error}
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="heat-tv-canvas-err">
          <p className="dash-muted">No hay datos en el mapa. Revisá que el API tenga snapshots.</p>
        </div>
      ) : (
        <>
          <div className="heat-tv-canvas">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {/* `nest` exige un clic para ampliar sector; `flat` dibuja sector + tickers a la vez */}
              <Treemap
                type="flat"
                data={sorted as unknown as ReadonlyArray<Record<string, unknown>>}
                dataKey="size"
                nameKey="name"
                stroke="rgba(255,255,255,0.08)"
                isAnimationActive={false}
                aspectRatio={4 / 3}
                content={nestTreemapCellContent}
              >
                <Tooltip content={<HeatmapDetailTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
          <footer className="heat-tv-legend" aria-label="Escala de color, variación diaria">
            <div className="heat-tv-legend-bar" />
            <div className="heat-tv-legend-labels">
              {LEGEND.map((item) => (
                <span key={item.label} className="heat-tv-legend-pill" style={{ background: item.c }}>
                  {item.label}
                </span>
              ))}
            </div>
          </footer>
        </>
      )}
      <p className="heat-tv-foot">
        {heatmap?.matched ?? 0} tickers en mapa · {heatmap?.scanned ?? 0} filas de snapshot
        {heatmap?.filters?.universeSize != null ? ` · universo API: ${heatmap.filters.universeSize}` : ''}
      </p>
    </div>
  )
}
