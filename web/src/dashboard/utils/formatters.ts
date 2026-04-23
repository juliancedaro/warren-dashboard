import type { DashboardRow } from '../types'

export function formatUsd(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(2)
}

export function formatPrice(n: number): string {
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(4)
}

export function formatRsDelta(d?: number | null): string {
  if (d == null || Number.isNaN(d)) return '—'
  if (d === 0) return '0'
  const ar = Math.abs(d).toFixed(1)
  return d > 0 ? `▲ ${ar}` : `▼ ${ar}`
}

export function formatDistPct(p?: number | null): string {
  if (p == null || Number.isNaN(p)) return '—'
  const sign = p >= 0 ? '+' : ''
  return `${sign}${p.toFixed(1)}%`
}

export function heatLogoFallback(label?: string): string {
  return String(label || '•')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
}

export function rsColor(rs: number): string {
  if (rs >= 70) return 'var(--dash-up)'
  if (rs >= 40) return 'var(--dash-mid)'
  return 'var(--dash-down)'
}

export function volDevBarColor(pct: number): string {
  if (pct >= 200) return '#f87171'
  if (pct >= 100) return '#fbbf24'
  return '#38bdf8'
}

export function rsiRsFill(r: DashboardRow): string {
  const rsi = r.rsi14
  if (rsi == null) return '#6b7280'
  if (rsi >= 70) return '#fb923c'
  if (r.rsScore > 60) return 'var(--dash-up)'
  return '#6b7280'
}

export function metricToneRsi(rsi?: number | null): 'up' | 'down' | 'warn' | 'mid' {
  if (rsi == null) return 'mid'
  if (rsi >= 80) return 'down'
  if (rsi >= 70) return 'warn'
  return 'up'
}

export function metricToneRs(rs: number): 'up' | 'down' | 'mid' {
  if (rs >= 60) return 'up'
  if (rs >= 40) return 'mid'
  return 'down'
}

export function metricToneVolRel(x: number): 'up' | 'warn' | 'mid' {
  if (x >= 1.2) return 'warn'
  if (x >= 0.8) return 'up'
  return 'mid'
}

export function mcapTier(cap?: number | null): { label: string; tier: string } {
  if (cap == null || cap <= 0) return { label: '—', tier: 'na' }
  if (cap >= 200e9) return { label: 'Mega', tier: 'mega' }
  if (cap >= 10e9) return { label: 'Large', tier: 'large' }
  if (cap >= 2e9) return { label: 'Mid', tier: 'mid' }
  if (cap >= 300e6) return { label: 'Small', tier: 'small' }
  return { label: 'Micro', tier: 'micro' }
}
