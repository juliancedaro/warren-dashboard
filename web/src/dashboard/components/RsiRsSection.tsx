import { CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardRow } from '../types'
import { rsiRsFill } from '../utils/formatters'

function RsiRsTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as DashboardRow
  return (
    <div className="dash-tooltip">
      <strong>{point.symbol}</strong>
      <div>RS Score: {point.rsScore.toFixed(1)}</div>
      <div>RSI 14: {point.rsi14 != null ? point.rsi14.toFixed(1) : '—'}</div>
    </div>
  )
}

export function RsiRsSection({ rows, loading }: { rows: DashboardRow[]; loading: boolean }) {
  return (
    <section className="dash-panel dash-panel-compact dash-panel-wide">
      <div className="dash-panel-head">
        <h2>RSI vs RS Score</h2>
        <p className="dash-muted">Zona ideal: RS alto + RSI no sobrecomprado</p>
      </div>
      <div className="dash-chart-wrap dash-chart-wrap-short">
        {loading && rows.length === 0 ? (
          <p className="dash-muted">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="dash-muted">Sin RSI (historial corto) o sin datos con los filtros actuales.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            <ScatterChart margin={{ top: 12, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="var(--dash-grid)" strokeDasharray="4 6" />
              <XAxis type="number" dataKey="rsScore" name="RS" domain={[0, 100]} tick={{ fill: 'var(--dash-muted)', fontSize: 11 }} stroke="var(--dash-border)" label={{ value: 'RS Score', position: 'bottom', offset: 0, fill: 'var(--dash-muted)', fontSize: 11 }} />
              <YAxis type="number" dataKey="rsi14" name="RSI" domain={[0, 100]} tick={{ fill: 'var(--dash-muted)', fontSize: 11 }} stroke="var(--dash-border)" label={{ value: 'RSI 14', angle: -90, position: 'insideLeft', fill: 'var(--dash-muted)', fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<RsiRsTooltip />} />
              <Scatter name="Tickers" data={rows}>{rows.map((row) => <Cell key={row.symbol} fill={rsiRsFill(row)} />)}</Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="dash-legend">
        <li><span className="dash-leg-dot" style={{ background: 'var(--dash-up)' }} />Ideal (RS &gt; 60, RSI &lt; 70)</li>
        <li><span className="dash-leg-dot" style={{ background: '#fb923c' }} />RSI sobrecomprado</li>
        <li><span className="dash-leg-dot" style={{ background: '#6b7280' }} />Resto</li>
      </ul>
    </section>
  )
}
