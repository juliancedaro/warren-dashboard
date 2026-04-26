import type { PaginationProps } from '../types'

export function PaginationControls({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="dash-pagination">
      <div className="dash-pagination-summary">
        <span>Mostrando {from}-{to} de {total}</span>
      </div>
      <div className="dash-pagination-right">
        <div className="dash-pagination-buttons">
          <button type="button" onClick={() => onPageChange(1)} disabled={page <= 1}>«</button>
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>‹</button>
          <span className="dash-pagination-page">Página {page} / {Math.max(totalPages, 1)}</span>
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>›</button>
          <button type="button" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>»</button>
        </div>
        <label className="dash-field dash-field-inline dash-pagination-size">
          <span>Mostrar</span>
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
