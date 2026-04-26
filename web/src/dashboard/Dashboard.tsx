import {
  DASH_MIN_CAPS,
  DASH_SEMAPHORE_SORT_OPTS,
  DASH_TOP_OPTS,
  DASH_VOL_THRESHOLD_OPTS,
} from './constants'
import { useDashboardData } from './DashboardDataContext'
import { CarouselSection } from './components/CarouselSection'
import { FilterBar } from './components/FilterBar'
import { FilterChips } from './components/FilterChips'
import { KpiSummary } from './components/KpiSummary'
import { RelativeStrengthMapSection } from './components/RelativeStrengthMapSection'
import { WarrenSection } from './components/WarrenSection'
// import { RsTrendSection } from './components/RsTrendSection' // Tendencia RS — oculto por ahora
// import { RelativeVolatilitySection } from './components/RelativeVolatilitySection' // Vol. relativa — oculto por ahora
import { ScannerSection } from './components/ScannerSection'
import { UnusualVolumeSection } from './components/UnusualVolumeSection'
import { RsiRsSection } from './components/RsiRsSection'
import { SemaphoreSection } from './components/SemaphoreSection'
import { formatDistPct, formatPrice, formatRsDelta, mcapTier, metricToneRsi, metricToneRs, metricToneVolRel } from './utils/formatters'

export default function Dashboard() {
  const { filters, bootstrap, derived, minCap } = useDashboardData()
  const summary = derived.summary ?? bootstrap.summary
  const marketLeader = bootstrap.carouselPayload?.rows?.find((row) => row.symbol === 'SPY') ?? null
  const marketRiskOn = (marketLeader?.changePct ?? 0) <= -1

  return (
    <div className={`dash ${marketRiskOn ? 'dash-market-risk' : ''}`}>
      <CarouselSection loading={bootstrap.carouselLoading} error={bootstrap.err} rows={bootstrap.carouselPayload?.rows ?? []} />

      <header className="dash-top">
        <div className="dash-brand">
          <h1 className="dash-title dash-title--logo">
            <img src="/bursyra-logo.png" alt="Bursyra" className="dash-logo" />
          </h1>
          <span className="dash-live"><span className="dash-live-dot" aria-hidden />EN VIVO</span>
        </div>
        <div className="dash-top-actions">
          {marketLeader ? (
            <div className="dash-market-pill" data-risk={marketRiskOn ? '1' : '0'}>
              <span>SPY</span>
              <strong>{marketLeader.changePct >= 0 ? '+' : ''}{marketLeader.changePct.toFixed(2)}%</strong>
            </div>
          ) : null}
          <button
            type="button"
            className="dash-btn"
            title="Vuelve a pedir al API el tablero, el carrusel, el mapa de calor y actualiza las filas mostradas"
            disabled={bootstrap.carouselLoading || bootstrap.heatmapLoading || bootstrap.loading}
            onClick={() => bootstrap.load(true)}
          >
            Actualizar
          </button>
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
        minCaps={DASH_MIN_CAPS}
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

      <FilterChips
        filters={filters.currentFilters}
        minCaps={DASH_MIN_CAPS}
        onRemove={filters.removeFilterChip}
        onClear={filters.resetFilters}
      />

      <div className="dash-results-bar">
        <span className="dash-results-count">{derived.filteredRows.length} resultados</span>
      </div>

      {bootstrap.err ? (
        <div className="dash-error" role="alert">
          {bootstrap.err}
          <p className="dash-error-hint">Levantá el API con <code>npm run dev:api</code>. Si falla Yahoo, puede ser rate limit o red. Probá <code>VITE_API_URL</code> si no usás el proxy de Vite.</p>
        </div>
      ) : null}

      <KpiSummary summary={summary} loading={bootstrap.carouselLoading || bootstrap.heatmapLoading} />

      <div className="dash-stack" aria-label="Mapa, Warren y momentum">
        <RelativeStrengthMapSection chartData={derived.chartData} loading={bootstrap.loading} />
        <WarrenSection enabled={bootstrap.secondaryReady} fetchJson={bootstrap.fetchJson} countries={filters.countries} indexTags={filters.indexTags} sectors={filters.sectors} industries={filters.industries} minCap={minCap} adrRange={filters.adrRange} excludeNear52w={filters.excludeNear52w} />
        {/* Tendencia RS Score — desactivada temporalmente
        <RsTrendSection enabled={bootstrap.tertiaryReady} fetchJson={bootstrap.fetchJson} countries={filters.countries} indexTags={filters.indexTags} sectors={filters.sectors} industries={filters.industries} minCap={minCap} adrRange={filters.adrRange} excludeNear52w={filters.excludeNear52w} />
        Volatilidad relativa — desactivada temporalmente
        <RelativeVolatilitySection enabled={bootstrap.tertiaryReady} fetchJson={bootstrap.fetchJson} countries={filters.countries} indexTags={filters.indexTags} sectors={filters.sectors} industries={filters.industries} minCap={minCap} adrRange={filters.adrRange} excludeNear52w={filters.excludeNear52w} />
        */}
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
        <UnusualVolumeSection
          rows={derived.unusualVolBars}
          loading={bootstrap.loading}
          unusualThresholdPct={filters.unusualThresholdPct}
          unusualTopN={filters.unusualTopN}
          onThresholdChange={filters.setUnusualThresholdPct}
          onTopNChange={filters.setUnusualTopN}
          thresholdOptions={DASH_VOL_THRESHOLD_OPTS}
          topOptions={DASH_TOP_OPTS}
          disabled={!bootstrap.payload}
        />
        <RsiRsSection rows={derived.rsiRsData} loading={bootstrap.loading} />
      </div>

      <SemaphoreSection
        enabled={bootstrap.secondaryReady}
        fetchJson={bootstrap.fetchJson}
        countries={filters.countries}
        indexTags={filters.indexTags}
        sectors={filters.sectors}
        industries={filters.industries}
        minCap={minCap}
        adrRange={filters.adrRange}
        excludeNear52w={filters.excludeNear52w}
        sort={filters.semaphoreSort}
        setSort={filters.setSemaphoreSort}
        unusualThresholdPct={filters.unusualThresholdPct}
        metricToneRsi={metricToneRsi}
        metricToneRs={metricToneRs}
        metricToneVolRel={metricToneVolRel}
        sortOptions={DASH_SEMAPHORE_SORT_OPTS}
      />
    </div>
  )
}
