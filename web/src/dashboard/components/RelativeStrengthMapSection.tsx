import { CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { DASH_RECHARTS_MARGIN_RIGHT } from '../constants'
import type { DashboardRow } from '../types'
import { formatUsd, rsColor } from '../utils/formatters'
import type { RechartsTooltipProps } from '../utils/rechartsTooltip'

function ChartTooltip({ active, payload }: RechartsTooltipProps<DashboardRow>) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as DashboardRow
  return (
    <div className="dash-tooltip">
      <strong>{point.symbol}</strong>
      <div>RS (rango 52S): {point.rsScore.toFixed(1)}</div>
      <div>Dist. máx 52S: {point.dist52wPct?.toFixed(2)}%</div>
      <div>Cap: {formatUsd(point.marketCap)}</div>
    </div>
  )
}

export function RelativeStrengthMapSection({ chartData, loading }: { chartData: DashboardRow[]; loading: boolean }) {
  return (
    <section className="dash-panel dash-chart-panel dash-panel-wide">
      <div className="dash-panel-head">
        <h2>Mapa de fuerza relativa</h2>
        <p className="dash-muted">Eje X: posición en rango 52 semanas (0–100). Eje Y: distancia al máximo 52S. Tamaño ~ market cap.</p>
      </div>
      <div className="dash-chart-wrap">
        {chartData.length === 0 && !loading ? (
          <p className="dash-muted">Sin datos para graficar.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={320}>
            <ScatterChart margin={{ top: 20, right: DASH_RECHARTS_MARGIN_RIGHT, bottom: 32, left: 10 }}>
              <CartesianGrid stroke="var(--dash-grid)" strokeDasharray="4 6" />
              {/* domain X un poco por encima de 100 para que las burbujas no queden pegadas al borde derecho */}
              <XAxis
                type="number"
                dataKey="rsScore"
                name="RS"
                domain={[-0.5, 112]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: 'var(--dash-muted)', fontSize: 11 }}
                stroke="var(--dash-border)"
                label={{ value: 'RS (rango 52S)', position: 'bottom', offset: 0, fill: 'var(--dash-muted)', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="dist52wPct"
                name="Dist"
                domain={[-100, 16.5]}
                padding={{ top: 8, bottom: 0 }}
                tick={{ fill: 'var(--dash-muted)', fontSize: 11 }}
                stroke="var(--dash-border)"
                label={{ value: 'Dist. máx 52S (%)', angle: -90, position: 'insideLeft', fill: 'var(--dash-muted)', fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="bubbleSize" range={[100, 1600]} name="Cap" />
              <Tooltip cursor={false} content={<ChartTooltip />} />
              <Scatter name="Tickers" data={chartData}>
                {chartData.map((row) => <Cell key={row.symbol} fill={rsColor(row.rsScore)} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="dash-legend">
        <li><span className="dash-leg-dot" style={{ background: 'var(--dash-up)' }} />Fuerte (RS ≥ 70)</li>
        <li><span className="dash-leg-dot" style={{ background: 'var(--dash-mid)' }} />Media</li>
        <li><span className="dash-leg-dot" style={{ background: 'var(--dash-down)' }} />Débil</li>
      </ul>
    </section>
  )
}
