import { useState } from 'react'
import type { CarouselRow } from '../types'
import { formatPrice } from '../utils/formatters'

function domainFromRow(row: CarouselRow) {
  if (!row.website) return null
  try {
    const normalized = row.website.startsWith('http') ? row.website : `https://${row.website}`
    return new URL(normalized).hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

function logoCandidates(row: CarouselRow) {
  const domain = domainFromRow(row)
  return [
    row.logoUrl || null,
    domain ? `https://logo.clearbit.com/${domain}` : null,
    domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null,
  ].filter(Boolean) as string[]
}

function TickerCarouselIcon({ row }: { row: CarouselRow }) {
  const candidates = logoCandidates(row)
  const [index, setIndex] = useState(0)
  const src = candidates[index] || null

  if (src) {
    return (
      <img
        className="dash-carousel-ico-img"
        src={src}
        alt=""
        loading="lazy"
        onError={() => setIndex((current) => current + 1)}
      />
    )
  }

  return <span className="dash-carousel-ico" aria-hidden="true">{row.symbol.slice(0, 2).toUpperCase()}</span>
}

function TickerCarouselCard({ row }: { row: CarouselRow }) {
  const up = row.changePct >= 0
  return (
    <article className="dash-carousel-card" data-up={up ? '1' : '0'} aria-label={`${row.symbol}, ${formatPrice(row.price)} USD, ${up ? 'sube' : 'baja'} ${Math.abs(row.changePct).toFixed(2)} por ciento`}>
      <TickerCarouselIcon row={row} />
      <div className="dash-carousel-body">
        <div className="dash-carousel-topline">
          <span className="dash-carousel-sym">{row.symbol}</span>
          <span className="dash-carousel-pct" data-up={up ? '1' : '0'}>
            <span className="dash-carousel-tri" aria-hidden="true">
              {up ? '▲' : '▼'}
            </span>
            {up ? '+' : ''}
            {row.changePct.toFixed(2)}%
          </span>
        </div>
        <div className="dash-carousel-midline">
          <span className="dash-carousel-price">${formatPrice(row.price)}</span>
        </div>
        <span className="dash-carousel-meta">Último precio</span>
      </div>
    </article>
  )
}

function TickerCarousel({ rows }: { rows: CarouselRow[] }) {
  const renderGroup = (id: string, ariaHidden: boolean) => (
    <div className="dash-carousel-group" key={id} {...(ariaHidden ? { 'aria-hidden': true } : {})}>
      {rows.map((row) => <TickerCarouselCard key={`${row.symbol}-${id}`} row={row} />)}
    </div>
  )
  return (
    <div className="dash-carousel" role="region" aria-label="Cotizaciones en carrusel">
      <div className="dash-carousel-viewport">
        <div className="dash-carousel-track">{renderGroup('a', false)}{renderGroup('b', true)}</div>
      </div>
    </div>
  )
}

interface Props {
  loading: boolean
  error: string | null
  rows: CarouselRow[]
}

export function CarouselSection({ loading, error, rows }: Props) {
  if (loading && rows.length === 0) return <div className="dash-carousel-shell dash-carousel-skel" aria-hidden="true" />
  if (error) return <div className="dash-carousel-shell dash-carousel-empty" role="status"><strong>No se pudo cargar el carrusel.</strong></div>
  if (!rows.length) {
    return (
      <div className="dash-carousel-shell dash-carousel-empty" role="status">
        <strong>Sin cotizaciones en el carrusel.</strong>
        <span>
          Levantá el API con <code>npm run dev:api</code> (puerto 3000). El histórico y perfil/cotización vienen de <strong>Yahoo Finance</strong> (sin key). Usá el proxy de Vite o <code>VITE_API_URL=http://localhost:3000</code>.
        </span>
      </div>
    )
  }
  return <TickerCarousel rows={rows} />
}
