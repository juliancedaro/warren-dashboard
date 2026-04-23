import './dashboard.css'
import type { MinCapOption, OptionItem } from './types'
import { useDashboardFilters } from './hooks/useDashboardFilters'
import { useDashboardBootstrap } from './hooks/useDashboardBootstrap'
import { useDashboardDerived } from './hooks/useDashboardDerived'
import { CarouselSection } from './components/CarouselSection'
import { FilterBar } from './components/FilterBar'
import { FilterChips } from './components/FilterChips'
import { KpiSummary } from './components/KpiSummary'
import { HeatmapSection } from './components/HeatmapSection'
import { RelativeStrengthMapSection } from './components/RelativeStrengthMapSection'
import { WarrenSection } from './components/WarrenSection'
import { RsTrendSection } from './components/RsTrendSection'
import { RelativeVolatilitySection } from './components/RelativeVolatilitySection'
import { ScannerSection } from './components/ScannerSection'
import { UnusualVolumeSection } from './components/UnusualVolumeSection'
import { RsiRsSection } from './components/RsiRsSection'
import { SemaphoreSection } from './components/SemaphoreSection'
import { formatDistPct, formatPrice, formatRsDelta, mcapTier, metricToneRsi, metricToneRs, metricToneVolRel } from './utils/formatters'

const MIN_CAPS: MinCapOption[] = [
  { id: '0', label: 'Todas', min: 0 },
  { id: '1b', label: '≥ 1B', min: 1e9 },
  { id: '10b', label: '≥ 10B', min: 10e9 },
  { id: '100b', label: '≥ 100B', min: 100e9 },
]

const TOP_OPTS = [10, 20, 50]
const VOL_THRESHOLD_OPTS = [30, 50, 100, 150]
const SEMAPHORE_SORT_OPTS: Array<OptionItem> = [
  { id: 'rs', label: 'RS Score' },
  { id: 'change', label: 'Var %' },
  { id: 'sym', label: 'Ticker' },
]

export default function Dashboard() {
  const filters = useDashboardFilters()
  const bootstrap = useDashboardBootstrap()
  const derived = useDashboardDerived({
    payload: bootstrap.payload,
    heatmap: bootstrap.heatmap,
    countries: filters.countries,
    indexTags: filters.indexTags,
    sectors: filters.sectors,
    industries: filters.industries,
    minCapId: filters.minCapId,
    adrRange: filters.adrRange,
    excludeNear52w: filters.excludeNear52w,
    unusualThresholdPct: filters.unusualThresholdPct,
    unusualTopN: filters.unusualTopN,
    minCapOptions: MIN_CAPS,
  })

  const minCap = derived.minCap
  const summary = derived.summary ?? bootstrap.summary
  const marketLeader = bootstrap.carouselPayload?.rows?.find((row) => row.symbol === 'SPY') ?? null
  const marketRiskOn = (marketLeader?.changePct ?? 0) <= -1

  const removeFilterChip = ({ key, value }: { key: 'country'|'indexTag'|'sector'|'industry'|'minCapId'|'adrRange'|'excludeNear52w'; value?: string }) => {
    if (key === 'excludeNear52w') return filters.setExcludeNear52w(false)
    if (key === 'minCapId') return filters.setMinCapId('0')
    if (key === 'adrRange') return filters.setAdrRange('all')
    if (key === 'country' && value) return filters.removeCountry(value)
    if (key === 'indexTag' && value) return filters.removeIndexTag(value)
    if (key === 'sector' && value) return filters.removeSector(value)
    if (key === 'industry' && value) return filters.removeIndustry(value)
  }

  return (
    <div className={`dash ${marketRiskOn ? 'dash-market-risk' : ''}`}>
      <CarouselSection loading={bootstrap.carouselLoading} error={bootstrap.err} rows={bootstrap.carouselPayload?.rows ?? []} />

      <header className="dash-top">
        <div className="dash-brand">
          <h1 className="dash-title">Cheddir Board</h1>
          <span className="dash-live"><span className="dash-live-dot" aria-hidden />EN VIVO</span>
        </div>
        <div className="dash-top-actions">
          {marketLeader ? (
            <div className="dash-market-pill" data-risk={marketRiskOn ? '1' : '0'}>
              <span>SPY</span>
              <strong>{marketLeader.changePct >= 0 ? '+' : ''}{marketLeader.changePct.toFixed(2)}%</strong>
            </div>
          ) : null}
          <button type="button" className="dash-btn" disabled={bootstrap.carouselLoading || bootstrap.heatmapLoading || bootstrap.loading} onClick={() => bootstrap.load(true)}>Actualizar</button>
        </div>
      </header>

      <FilterBar
        countriesSelected={filters.countries}
        countries={derived.countries}
        indexTagsSelected={filters.indexTags}
        indexTags={derived.indexTags}
        sectorsSelected={filters.sectors}
        sectors={derived.sectors}
        industriesSelected={filters.industries}
        industries={derived.industries}
        minCapId={filters.minCapId}
        minCaps={MIN_CAPS}
        adrRange={filters.adrRange}
        excludeNear52w={filters.excludeNear52w}
        disabled={!bootstrap.payload}
        onCountriesChange={filters.setCountries}
        onIndexTagsChange={filters.setIndexTags}
        onSectorsChange={filters.setSectors}
        onIndustriesChange={filters.setIndustries}
        onMinCapChange={filters.setMinCapId}
        onAdrRangeChange={filters.setAdrRange}
        onExcludeNear52wChange={filters.setExcludeNear52w}
      />

      <FilterChips filters={filters.currentFilters} minCaps={MIN_CAPS} onRemove={removeFilterChip} onClear={filters.resetFilters} />

      <div className="dash-results-bar">
        <span className="dash-results-count">{derived.filteredRows.length} resultados</span>
      </div>

      {bootstrap.bootstrapMeta?.isRefreshing ? <p className="dash-muted">Actualizando snapshots en segundo plano…</p> : null}

      {bootstrap.err ? (
        <div className="dash-error" role="alert">
          {bootstrap.err}
          <p className="dash-error-hint">Levantá el API con <code>npm run dev:api</code>. Si falla Yahoo, puede ser rate limit o red. Probá <code>VITE_API_URL</code> si no usás el proxy de Vite.</p>
        </div>
      ) : null}

      <KpiSummary summary={summary} loading={bootstrap.carouselLoading || bootstrap.heatmapLoading} />

      <HeatmapSection heatmap={bootstrap.heatmap} loading={bootstrap.heatmapLoading} error={bootstrap.heatmapErr} heatmapTreemapData={derived.heatmapTreemapData} />

      <div className="dash-stack" aria-label="Mapa, Warren y momentum">
        <RelativeStrengthMapSection chartData={derived.chartData} loading={bootstrap.loading} />
        <WarrenSection enabled={bootstrap.secondaryReady} fetchJson={bootstrap.fetchJson} countries={filters.countries} indexTags={filters.indexTags} sectors={filters.sectors} industries={filters.industries} minCap={minCap} adrRange={filters.adrRange} excludeNear52w={filters.excludeNear52w} />
        <RsTrendSection enabled={bootstrap.tertiaryReady} fetchJson={bootstrap.fetchJson} countries={filters.countries} indexTags={filters.indexTags} sectors={filters.sectors} industries={filters.industries} minCap={minCap} adrRange={filters.adrRange} excludeNear52w={filters.excludeNear52w} />
        <RelativeVolatilitySection enabled={bootstrap.tertiaryReady} fetchJson={bootstrap.fetchJson} countries={filters.countries} indexTags={filters.indexTags} sectors={filters.sectors} industries={filters.industries} minCap={minCap} adrRange={filters.adrRange} excludeNear52w={filters.excludeNear52w} />
      </div>

      <ScannerSection
        enabled={bootstrap.secondaryReady}
        fetchJson={bootstrap.fetchJson}
        countries={filters.countries}
        indexTags={filters.indexTags}
        sectors={filters.sectors}
        industries={filters.industries}
        minCap={minCap}
        adrRange={filters.adrRange}
        excludeNear52w={filters.excludeNear52w}
        scanRsMin={filters.scanRsMin}
        setScanRsMin={filters.setScanRsMin}
        scanVolRelMax={filters.scanVolRelMax}
        setScanVolRelMax={filters.setScanVolRelMax}
        scanRsiMin={filters.scanRsiMin}
        setScanRsiMin={filters.setScanRsiMin}
        scanRsiMax={filters.scanRsiMax}
        setScanRsiMax={filters.setScanRsiMax}
        scanSoloVolInusual={filters.scanSoloVolInusual}
        setScanSoloVolInusual={filters.setScanSoloVolInusual}
        mcapTier={mcapTier}
        formatPrice={formatPrice}
        formatRsDelta={formatRsDelta}
        formatDistPct={formatDistPct}
      />

      <div className="dash-stack" aria-label="Volumen inusual y RSI">
        <UnusualVolumeSection rows={derived.unusualVolBars} loading={bootstrap.loading} unusualThresholdPct={filters.unusualThresholdPct} unusualTopN={filters.unusualTopN} onThresholdChange={filters.setUnusualThresholdPct} onTopNChange={filters.setUnusualTopN} thresholdOptions={VOL_THRESHOLD_OPTS} topOptions={TOP_OPTS} disabled={!bootstrap.payload} />
        <RsiRsSection rows={derived.rsiRsData} loading={bootstrap.loading} />
      </div>

      <SemaphoreSection enabled={bootstrap.secondaryReady} fetchJson={bootstrap.fetchJson} countries={filters.countries} indexTags={filters.indexTags} sectors={filters.sectors} industries={filters.industries} minCap={minCap} adrRange={filters.adrRange} excludeNear52w={filters.excludeNear52w} sort={filters.semaphoreSort} setSort={filters.setSemaphoreSort} unusualThresholdPct={filters.unusualThresholdPct} metricToneRsi={metricToneRsi} metricToneRs={metricToneRs} metricToneVolRel={metricToneVolRel} sortOptions={SEMAPHORE_SORT_OPTS} />
    </div>
  )
}
