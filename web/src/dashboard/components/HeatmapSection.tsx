import { ResponsiveContainer, Tooltip, Treemap } from 'recharts'
import type { HeatmapPayload } from '../types'
import { formatPrice, formatUsd, heatLogoFallback } from '../utils/formatters'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getLeafFill(changePct: number | null | undefined, fallback?: string) {
  const value = Number(changePct ?? 0)

  if (!Number.isFinite(value)) return fallback || '#2a2f3a'
  if (value >= 6) return '#15803d'
  if (value >= 3) return '#16a34a'
  if (value >= 1) return '#22c55e'
  if (value > -1) return '#b8bcc4'
  if (value > -3) return '#ef8086'
  if (value > -6) return '#e5545a'
  return '#cb2a2f'
}

function HeatmapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  if (point?.children) return null

  return (
    <div
      style={{
        background: '#0b0f14',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        minWidth: 240,
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {point.logoUrl ? (
          <img
            className="dash-heatmap-tip-logo"
            src={point.logoUrl}
            alt=""
            loading="lazy"
            style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }}
          />
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            {heatLogoFallback(point.symbol)}
          </div>
        )}

        <div>
          <div style={{ fontWeight: 800, lineHeight: 1.1 }}>{point.symbol}</div>
          <div style={{ fontSize: 11, opacity: 0.65 }}>{point.fullName}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.92 }}>
        <div>
          {point.sector} · {point.industry}
        </div>
        <div style={{ marginTop: 6 }}>
          <strong>Precio:</strong> ${point.price != null ? formatPrice(Number(point.price)) : '—'}
        </div>
        <div>
          <strong>Cap:</strong> {formatUsd(point.marketCap ?? point.size ?? 0)}
        </div>
        <div>
          <strong>ADR (20s):</strong> {point.adrPct != null ? Number(point.adrPct).toFixed(2) : '—'}%
        </div>
        <div
          style={{
            marginTop: 8,
            fontWeight: 800,
            color: Number(point.changePct) >= 0 ? '#22c55e' : '#ef4444',
          }}
        >
          {Number(point.changePct) >= 0 ? '+' : ''}
          {Number(point.changePct).toFixed(2)}%
        </div>
      </div>
    </div>
  )
}

function SectorTreemapCellContent(props: any) {
  const { x, y, width, height, name, children, depth, logoUrl, symbol, fullName, changePct, fill } = props

  const isLeaf = !children?.length
  const w = Math.max(0, width)
  const h = Math.max(0, height)

  if (w < 4 || h < 4) return null

  if (!isLeaf) {
    const label = String(name || '')
    const showIndustry = depth === 1 && w > 80 && h > 18

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={4}
          ry={4}
          fill="#111827"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
        {showIndustry ? (
          <>
            <rect
              x={x}
              y={y}
              width={w}
              height={22}
              rx={4}
              ry={4}
              fill="#0b1220"
            />
            <text
              x={x + 8}
              y={y + 15}
              fill="#e5e7eb"
              fontSize={10}
              fontWeight={700}
            >
              {w < 120 && label.length > 16 ? `${label.slice(0, 15)}…` : label}
            </text>
          </>
        ) : null}
      </g>
    )
  }

  const bg = getLeafFill(changePct, fill)
  const ticker = String(symbol || name || '')
  const pctValue = Number(changePct ?? 0)
  const pctText = `${pctValue >= 0 ? '+' : ''}${pctValue.toFixed(2)}%`
  const pad = 6
  const logoSize = clamp(Math.min(w, h) * 0.24, 16, 38)
  const showLogo = w > 70 && h > 58
  const showPct = w > 56 && h > 36
  const showName = w > 42 && h > 20
  const showFullName = w > 130 && h > 90
  const centerLayout = w > 128 && h > 92
  const tickerText = w < 72 && ticker.length > 6 ? `${ticker.slice(0, 5)}…` : ticker
  const tickerFont = w > 180 && h > 120 ? 22 : w > 120 && h > 90 ? 18 : w > 84 ? 14 : 11
  const pctFont = w > 180 && h > 120 ? 16 : w > 120 && h > 90 ? 13 : 10
  const nameFont = w > 180 ? 11 : 10

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={2}
        ry={2}
        fill={bg}
        stroke="rgba(255,255,255,0.72)"
        strokeWidth={0.9}
      />

      {centerLayout ? (
        <>
          {showLogo ? (
            logoUrl ? (
              <image
                href={logoUrl}
                x={x + w / 2 - logoSize / 2}
                y={y + pad + 4}
                width={logoSize}
                height={logoSize}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : (
              <g>
                <circle
                  cx={x + w / 2}
                  cy={y + pad + 4 + logoSize / 2}
                  r={logoSize / 2}
                  fill="rgba(0,0,0,0.25)"
                />
                <text
                  x={x + w / 2}
                  y={y + pad + 4 + logoSize / 2 + 4}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize={Math.max(10, logoSize * 0.34)}
                  fontWeight={800}
                >
                  {heatLogoFallback(ticker || fullName || name)}
                </text>
              </g>
            )
          ) : null}

          {showName ? (
            <text
              x={x + w / 2}
              y={y + (showLogo ? pad + logoSize + 28 : h / 2)}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={tickerFont}
              fontWeight={800}
            >
              {tickerText}
            </text>
          ) : null}

          {showFullName ? (
            <text
              x={x + w / 2}
              y={y + h - 30}
              textAnchor="middle"
              fill="rgba(255,255,255,0.78)"
              fontSize={nameFont}
              fontWeight={500}
            >
              {String(fullName || '').slice(0, 18)}
            </text>
          ) : null}

          {showPct ? (
            <text
              x={x + w / 2}
              y={y + h - 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.96)"
              fontSize={pctFont}
              fontWeight={700}
            >
              {pctText}
            </text>
          ) : null}
        </>
      ) : (
        <>
          {showLogo ? (
            logoUrl ? (
              <image
                href={logoUrl}
                x={x + pad}
                y={y + pad}
                width={logoSize}
                height={logoSize}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : (
              <g>
                <circle
                  cx={x + pad + logoSize / 2}
                  cy={y + pad + logoSize / 2}
                  r={logoSize / 2}
                  fill="rgba(0,0,0,0.25)"
                />
                <text
                  x={x + pad + logoSize / 2}
                  y={y + pad + logoSize / 2 + 4}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize={Math.max(9, logoSize * 0.34)}
                  fontWeight={800}
                >
                  {heatLogoFallback(ticker || fullName || name)}
                </text>
              </g>
            )
          ) : null}

          {showName ? (
            <text
              x={x + pad}
              y={y + (showLogo ? pad + logoSize + 14 : h / 2 + 4)}
              fill="#ffffff"
              fontSize={tickerFont}
              fontWeight={800}
            >
              {tickerText}
            </text>
          ) : null}

          {showPct ? (
            <text
              x={x + pad}
              y={y + h - 8}
              fill="rgba(255,255,255,0.92)"
              fontSize={pctFont}
              fontWeight={700}
            >
              {pctText}
            </text>
          ) : null}
        </>
      )}
    </g>
  )
}

function sectorSize(sector: any) {
  return (sector?.children ?? []).reduce((acc: number, industry: any) => {
    return (
      acc +
      (industry?.children ?? []).reduce((inner: number, stock: any) => inner + Number(stock.size ?? 0), 0)
    )
  }, 0)
}

function sectorSpanClass(index: number, total: number) {
  if (index === 0) return 'span-2x2'
  if (index === 1 || index === 2) return 'span-1x1-large'
  if (total <= 4) return 'span-1x1-large'
  return 'span-1x1'
}

interface Props {
  heatmap: HeatmapPayload | null
  loading: boolean
  error: string | null
  heatmapTreemapData: any[]
}

export function HeatmapSection({ heatmap, loading, error, heatmapTreemapData }: Props) {
  const sectors = [...heatmapTreemapData]
    .sort((a, b) => sectorSize(b) - sectorSize(a))

  return (
    <section className="dash-panel dash-heatmap-panel" aria-label="Mapa de calor">
      <div className="dash-panel-head">
        <h2>Mapa de calor sectorizado (sector → industria)</h2>
        <p className="dash-muted">
          Universo grande-cap (~50 tickers). Filtros: capitalización{' '}
          {heatmap?.filters
            ? `${formatUsd(heatmap.filters.minCapUsd)} – ${formatUsd(heatmap.filters.maxCapUsd)}`
            : '50B – 2T'}
          ; ADR medio ({heatmap?.filters?.adrSessions ?? 20} ruedas) entre{' '}
          {heatmap?.filters
            ? `${heatmap.filters.minAdrPct}% y ${heatmap.filters.maxAdrPct}%`
            : '2% y 4%'}
          . Tamaño del bloque ~ market cap; color ~ variación del día. Agrupado por sector e
          industria, con logo cuando Yahoo trae website.
        </p>
      </div>

      {loading && !heatmap ? (
        <div className="dash-heatmap-chart dash-heatmap-skel" aria-hidden="true" />
      ) : error ? (
        <div className="dash-heatmap-chart dash-panel-placeholder">
          <p className="dash-muted" role="alert">
            Mapa de calor: {error}
          </p>
        </div>
      ) : sectors.length === 0 ? (
        <div className="dash-heatmap-chart dash-panel-placeholder">
          <p className="dash-muted">No data to show.</p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gap: 12,
              alignItems: 'stretch',
            }}
          >
            {sectors.map((sector, index) => {
              const span = sectorSpanClass(index, sectors.length)
              const cardStyle: React.CSSProperties =
                span === 'span-2x2'
                  ? { gridColumn: 'span 6', minHeight: 440 }
                  : span === 'span-1x1-large'
                    ? { gridColumn: 'span 6', minHeight: 260 }
                    : { gridColumn: 'span 4', minHeight: 240 }

              return (
                <div
                  key={sector.name}
                  style={{
                    ...cardStyle,
                    background: '#eef3ff',
                    border: '2px solid #3b82f6',
                    borderRadius: 12,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 14,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{sector.name}</span>
                    <span style={{ opacity: 0.88, fontSize: 18, lineHeight: 1 }}>›</span>
                  </div>

                  <div style={{ flex: 1, minHeight: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <Treemap
                        type="flat"
                        data={sector.children}
                        dataKey="size"
                        nameKey="name"
                        aspectRatio={4 / 3}
                        isAnimationActive={false}
                        content={<SectorTreemapCellContent />}
                      >
                        <Tooltip content={<HeatmapTooltip />} />
                      </Treemap>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
              marginBottom: 6,
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: '-6%+', color: '#cb2a2f' },
              { label: '-3%', color: '#e5545a' },
              { label: '0%', color: '#b8bcc4' },
              { label: '+3%', color: '#16a34a' },
              { label: '+6%+', color: '#15803d' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: item.color,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--dash-text-muted)' }}>{item.label}</span>
              </div>
            ))}
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