import { ResponsiveContainer, Tooltip, Treemap } from 'recharts'
import type { HeatmapPayload, HeatmapSectorColumn, TreemapLeaf } from '../types'
import { formatUsd, heatLogoFallback } from '../utils/formatters'
import { HeatmapDetailTooltip } from './HeatmapDetailTooltip'

type TreemapCellProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  children?: readonly unknown[] | undefined
  fill?: string
  logoUrl?: string | null
  symbol?: string
  fullName?: string
  changePct?: number | null
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function createStripLeafRenderer(sectorName: string) {
  const slug = sectorName.replace(/[^a-z0-9]+/gi, '-').slice(0, 20) || 's'

  return function StripLeafContent(props: Record<string, unknown>) {
    const { x, y, width, height, name, children, fill, logoUrl, symbol, fullName, changePct } =
      props as TreemapCellProps
    if (children && children.length > 0) return null

    const w = Math.max(0, width)
    const h = Math.max(0, height)
    if (w < 3 || h < 3) return null

    const x0 = x ?? 0
    const y0 = y ?? 0
    const sym = String(symbol || name || '')
    const idSafe = `h-${slug}-${sym.replace(/[^A-Z0-9]/gi, 'x')}`
    const bg = fill || '#1a1d26'
    const ch = changePct == null || !Number.isFinite(Number(changePct)) ? 0 : Number(changePct)
    const pctText = `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`
    const company = String(fullName || '')

    const r = clamp(Math.min(w, h) * 0.14, 9, 20)
    const logoLeft = x0 + 4
    const showLogo = w > 36 && h > 36
    const cy = y0 + 4 + r
    const textLeft = showLogo ? logoLeft + 2 * r + 4 : x0 + 4
    const tight = w < 52 || h < 44
    const showName = !tight && w > 72 && h > 50 && company.length > 0
    const nameClip = w < 100 ? 14 : 22
    const symFont = tight ? 10 : w > 100 ? 13 : 11

    return (
      <g style={{ cursor: 'default' }} role="presentation">
        <rect
          x={x0}
          y={y0}
          width={w}
          height={h}
          rx={2}
          ry={2}
          fill={bg}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={0.75}
        />
        {showLogo ? (
          <g>
            <defs>
              <clipPath id={idSafe}>
                <circle cx={logoLeft + r} cy={cy} r={r} />
              </clipPath>
            </defs>
            {logoUrl ? (
              <image
                href={logoUrl}
                x={logoLeft}
                y={y0 + 4}
                width={2 * r}
                height={2 * r}
                clipPath={`url(#${idSafe})`}
                preserveAspectRatio="xMidYMid slice"
                opacity={0.95}
              />
            ) : (
              <g>
                <circle cx={logoLeft + r} cy={cy} r={r} fill="rgba(0,0,0,0.3)" />
                <text
                  x={logoLeft + r}
                  y={cy + 4}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize={Math.max(7, r * 0.85)}
                  fontWeight={800}
                >
                  {heatLogoFallback(sym)}
                </text>
              </g>
            )}
          </g>
        ) : null}
        {tight ? (
          <>
            <text x={x0 + 3} y={y0 + h * 0.5 + 2} fill="#f8fafc" fontSize={9} fontWeight={800}>
              {sym.length > 5 ? `${sym.slice(0, 4)}…` : sym}
            </text>
            <text
              x={x0 + 3}
              y={y0 + h - 3}
              fill="rgba(255,255,255,0.88)"
              fontSize={8}
              fontWeight={600}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {pctText}
            </text>
          </>
        ) : (
          <>
            <text
              x={textLeft}
              y={y0 + 14 + (tight ? 0 : 0)}
              fill="#f8fafc"
              fontSize={symFont}
              fontWeight={800}
            >
              {w < 64 && sym.length > 5 ? `${sym.slice(0, 4)}…` : sym}
            </text>
            {showName ? (
              <text
                x={textLeft}
                y={y0 + 27}
                fill="rgba(226, 232, 240, 0.72)"
                fontSize={9}
                fontWeight={500}
              >
                {company.length > nameClip ? `${company.slice(0, nameClip)}…` : company}
              </text>
            ) : null}
            <text
              x={x0 + 4}
              y={y0 + h - 5}
              fill="rgba(255,255,255,0.9)"
              fontSize={9}
              fontWeight={600}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {pctText}
            </text>
          </>
        )}
      </g>
    )
  }
}

interface Props {
  heatmap: HeatmapPayload | null
  loading: boolean
  error: string | null
  heatmapSectors: HeatmapSectorColumn[]
}

export function HeatmapSection({ heatmap, loading, error, heatmapSectors }: Props) {
  return (
    <section className="dash-panel dash-heatmap-panel" aria-label="Mapa de calor por sector">
      <div className="dash-panel-head">
        <h2>Mapa de calor (S&amp;P — por sector)</h2>
        <p className="dash-muted">
          Universo grande-cap (~{heatmap?.filters?.universeSize ?? '50'} tickers S&amp;P representativos).
          Filtros: capitalización{' '}
          {heatmap?.filters ? formatUsd(heatmap.filters.minCapUsd) : '50.00B'} –{' '}
          {heatmap?.filters ? formatUsd(heatmap.filters.maxCapUsd) : '2.00T'}; ADR medio (20
          ruedas) entre {heatmap?.filters ? `${heatmap.filters.minAdrPct}% y ${heatmap.filters.maxAdrPct}%` : '2% y 4%'}
          . Tamaño del bloque ≈ market cap; color ≈ variación del día. Cada columna: top por capitalización
          en el sector, con logo si Yahoo aporta website. Desplazá la tira <strong>horizontalmente</strong> para ver
          más sectores.
        </p>
      </div>

      {loading && !heatmap ? (
        <div className="dash-heatmap-strip-skel" aria-hidden="true" />
      ) : error ? (
        <div className="dash-heatmap-chart dash-panel-placeholder">
          <p className="dash-muted" role="alert">
            Mapa de calor: {error}
          </p>
        </div>
      ) : heatmapSectors.length === 0 ? (
        <div className="dash-heatmap-chart dash-panel-placeholder">
          <p className="dash-muted">No data to show.</p>
        </div>
      ) : (
        <>
          <div className="dash-heatmap-strip" role="list" aria-label="Sectores en tira horizontal">
            {heatmapSectors.map((col) => {
              if (!col.leaves.length) return null
              const data = col.leaves as unknown as ReadonlyArray<Record<string, unknown>>
              return (
                <div className="dash-heatmap-strip-card" key={col.name} role="listitem" aria-label={col.name}>
                  <div className="dash-heatmap-strip-head">
                    <span className="dash-heatmap-strip-title">{col.name}</span>
                    <span className="dash-heatmap-strip-chev" aria-hidden>
                      ›
                    </span>
                  </div>
                  <div className="dash-heatmap-strip-body">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                      <Treemap
                        type="flat"
                        data={data}
                        dataKey="size"
                        nameKey="name"
                        stroke="rgba(255,255,255,0.1)"
                        isAnimationActive={false}
                        content={createStripLeafRenderer(col.name)}
                      >
                        <Tooltip content={<HeatmapDetailTooltip />} />
                      </Treemap>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="dash-foot">
            Coincidencias: {heatmap?.matched ?? 0} / escaneados: {heatmap?.scanned ?? 0} · Universo:{' '}
            {heatmap?.filters?.universeSize ?? '—'} tickers
            {heatmap?.skipped?.length ? <> · Omitidos/error: {heatmap.skipped.length}</> : null}
          </p>
        </>
      )}
    </section>
  )
}
