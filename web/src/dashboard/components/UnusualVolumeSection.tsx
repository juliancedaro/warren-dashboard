import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DASH_RECHARTS_MARGIN_RIGHT } from '../constants'
import type { DashboardRow } from '../types'
import { volDevBarColor } from '../utils/formatters'
import type { RechartsTooltipProps } from '../utils/rechartsTooltip'

function VolBarTooltip({ active, payload }: RechartsTooltipProps<DashboardRow>) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as DashboardRow
  return (
    <div className="dash-tooltip">
      <strong>{point.symbol}</strong>
      <div>Desvío vs prom. 5 ses.: +{point.volDevPct5?.toFixed(1)}%</div>
      <div>Vol rel. (20d): {point.volRelative.toFixed(2)}x</div>
    </div>
  )
}

interface Props {
  rows: DashboardRow[]
  loading: boolean
  unusualThresholdPct: number
  unusualTopN: number
  onThresholdChange: (value: number) => void
  onTopNChange: (value: number) => void
  thresholdOptions: number[]
  topOptions: number[]
  disabled?: boolean
}

export function UnusualVolumeSection({
  rows,
  loading,
  unusualThresholdPct,
  unusualTopN,
  onThresholdChange,
  onTopNChange,
  thresholdOptions,
  topOptions,
  disabled,
}: Props) {
  const xTickInterval = rows.length > 24 ? 1 : 0

  return (
    <section className="dash-panel dash-panel-compact dash-panel-wide">
      <div className="dash-panel-head dash-panel-head-row">
        <div>
          <h2>Volumen inusual hoy</h2>
          <p className="dash-muted">Desvío vs promedio 5 ruedas</p>
        </div>
        <div className="dash-inline-fields">
          <label className="dash-field dash-field-inline">
            <span>Umbral</span>
            <select value={unusualThresholdPct} onChange={(e) => onThresholdChange(Number(e.target.value))} disabled={disabled}>
              {thresholdOptions.map((value) => <option key={value} value={value}>+{value}%</option>)}
            </select>
          </label>
          <label className="dash-field dash-field-inline">
            <span>Ranking</span>
            <select value={unusualTopN} onChange={(e) => onTopNChange(Number(e.target.value))} disabled={disabled}>
              {topOptions.map((value) => <option key={value} value={value}>Top {value}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="dash-chart-wrap dash-chart-wrap-short dash-chart-recharts">
        {loading && rows.length === 0 ? (
          <p className="dash-muted">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="dash-muted">Ningún ticker supera el umbral con los filtros actuales.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            <BarChart data={rows} margin={{ top: 8, right: DASH_RECHARTS_MARGIN_RIGHT, left: 4, bottom: 36 }}>
              <CartesianGrid stroke="var(--dash-grid)" strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="symbol"
                padding={{ left: 0.06, right: 0.14 }}
                tick={{ fill: 'var(--dash-muted)', fontSize: 10 }}
                stroke="var(--dash-border)"
                interval={xTickInterval}
                angle={-28}
                textAnchor="end"
                height={56}
              />
              <YAxis tickFormatter={(v) => `+${v}%`} tick={{ fill: 'var(--dash-muted)', fontSize: 11 }} stroke="var(--dash-border)" domain={[0, 'auto']} label={{ value: 'Desvío %', angle: -90, position: 'insideLeft', fill: 'var(--dash-muted)', fontSize: 11 }} />
              <Tooltip cursor={false} content={<VolBarTooltip />} />
              <Bar dataKey="volDevPct5" radius={[6, 6, 0, 0]}>
                {rows.map((row) => <Cell key={row.symbol} fill={volDevBarColor(row.volDevPct5 ?? 0)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
