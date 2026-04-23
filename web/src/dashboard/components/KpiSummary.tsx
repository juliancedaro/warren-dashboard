import type { DashboardSummary } from '../types'

interface Props {
  summary: DashboardSummary | null
  loading: boolean
}

export function KpiSummary({ summary, loading }: Props) {
  return (
    <section className="dash-kpis" aria-label="Resumen">
      {loading && !summary ? (
        <>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="dash-kpi dash-skel-kpi" />
          ))}
        </>
      ) : (
        <>
          <div className="dash-kpi"><span className="dash-kpi-label">Activos</span><strong>{summary?.activeTickers ?? '—'}</strong></div>
          <div className="dash-kpi"><span className="dash-kpi-label">Sobre EMA20</span><strong>{summary?.aboveEma20 ?? '—'}</strong></div>
          <div className="dash-kpi"><span className="dash-kpi-label">Sobre EMA50</span><strong>{summary?.aboveEma50 ?? '—'}</strong></div>
          <div className="dash-kpi"><span className="dash-kpi-label">Sobre EMA200</span><strong>{summary?.aboveEma200 ?? '—'}</strong></div>
          <div className="dash-kpi"><span className="dash-kpi-label">RS mapa &gt; 70</span><strong>{summary?.rsScoreGt70 ?? '—'}</strong></div>
          <div className="dash-kpi"><span className="dash-kpi-label">Vol. inusual</span><strong>{summary?.unusualVolToday ?? '—'}</strong></div>
          <div className="dash-kpi"><span className="dash-kpi-label">Calidad</span><strong>{summary?.qualityCandidates ?? '—'}</strong></div>
        </>
      )}
    </section>
  )
}
