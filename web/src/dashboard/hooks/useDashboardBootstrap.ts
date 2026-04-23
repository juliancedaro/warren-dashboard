import { useCallback, useEffect, useRef, useState } from 'react'
import type { DashboardBootstrapPayload, DashboardBootstrapState, DashboardTablePayload, HeatmapPayload } from '../types'
import { useApiFetch } from './useApiFetch'

const SECONDARY_DELAY_MS = 250
const TABLE_DELAY_MS = 1600

export function useDashboardBootstrap(): DashboardBootstrapState {
  const fetchJson = useApiFetch()
  const [carouselPayload, setCarouselPayload] = useState<{ rows: any[] } | null>(null)
  const [carouselLoading, setCarouselLoading] = useState(true)
  const [payload, setPayload] = useState<DashboardTablePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapPayload | null>(null)
  const [heatmapLoading, setHeatmapLoading] = useState(false)
  const [heatmapErr, setHeatmapErr] = useState<string | null>(null)
  const [bootstrapMeta, setBootstrapMeta] = useState<DashboardBootstrapPayload | null>(null)
  const [summary, setSummary] = useState<DashboardBootstrapPayload['summary']>(null)
  const [secondaryReady, setSecondaryReady] = useState(false)
  const [tertiaryReady, setTertiaryReady] = useState(false)
  const tableTimerRef = useRef<number | null>(null)

  const clearTimers = () => {
    if (tableTimerRef.current != null) {
      window.clearTimeout(tableTimerRef.current)
      tableTimerRef.current = null
    }
  }

  const load = useCallback(async (refresh = false) => {
    const q = refresh ? '?refresh=1' : ''
    clearTimers()
    setErr(null)
    setHeatmapErr(null)
    setCarouselLoading(true)
    setLoading(true)
    setHeatmapLoading(false)
    setSecondaryReady(false)
    setTertiaryReady(false)

    const [bootstrapResult, carouselResult] = await Promise.allSettled([
      fetchJson<DashboardBootstrapPayload>(`/dashboard/bootstrap${q}`),
      fetchJson<{ rows: any[] }>(`/dashboard/carousel${q}`),
    ])

    if (bootstrapResult.status === 'fulfilled') {
      setBootstrapMeta(bootstrapResult.value)
      setSummary(bootstrapResult.value.summary)
    } else {
      setBootstrapMeta(null)
      setSummary(null)
    }

    if (carouselResult.status === 'fulfilled') {
      setCarouselPayload(carouselResult.value)
    } else {
      const message = carouselResult.reason instanceof Error ? carouselResult.reason.message : String(carouselResult.reason)
      setErr(message)
      setCarouselPayload(null)
      setPayload(null)
      setHeatmap(null)
      setCarouselLoading(false)
      setLoading(false)
      return
    }
    setCarouselLoading(false)

    setHeatmapLoading(true)
    try {
      const heatmapBody = await fetchJson<HeatmapPayload>(`/dashboard/heatmap${q}`)
      setHeatmap(heatmapBody)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setHeatmapErr(message)
      setHeatmap(null)
    } finally {
      setHeatmapLoading(false)
    }

    window.setTimeout(() => setSecondaryReady(true), SECONDARY_DELAY_MS)
    tableTimerRef.current = window.setTimeout(() => {
      setTertiaryReady(true)
      void fetchJson<DashboardTablePayload>(`/dashboard/table${q}`)
        .then((body) => {
          setPayload(body)
          const rows = body?.rows ?? []
          if (rows.length) {
            setSummary((prev) => prev ?? {
              activeTickers: rows.length,
              aboveEma20: rows.filter((row) => Boolean(row.aboveEma20)).length,
              aboveEma50: rows.filter((row) => Boolean(row.aboveEma50)).length,
              aboveEma200: rows.filter((row) => Boolean(row.aboveEma200)).length,
              rsScoreGt70: rows.filter((row) => (row.rsScore ?? 0) >= 70).length,
              unusualVolToday: rows.filter((row) => Boolean(row.unusualVol) || (row.volDevPct5 ?? 0) >= 50).length,
              qualityCandidates: rows.filter((row) => (row.warrenScore ?? 0) >= 6).length,
            })
          }
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error)
          setErr((prev) => prev ?? message)
          setPayload(null)
        })
        .finally(() => {
          setLoading(false)
        })
    }, TABLE_DELAY_MS)
  }, [fetchJson])

  useEffect(() => {
    void load(false)
    return clearTimers
  }, [load])

  return {
    carouselPayload,
    carouselLoading,
    payload,
    loading,
    err,
    heatmap,
    heatmapLoading,
    heatmapErr,
    bootstrapMeta,
    summary,
    secondaryReady,
    tertiaryReady,
    load,
    fetchJson,
  }
}
