import { useEffect, useMemo, useState } from 'react'
import type { FetchJson, PaginatedHookState, PaginatedResponse } from '../types'
import { buildQueryString, stableQueryKey } from '../utils/query'

interface Params<T> {
  endpoint: string
  fetchJson: FetchJson
  query: Record<string, string | number | boolean | string[] | null | undefined>
  pageSizeOptions?: number[]
  enabled?: boolean
}

export function usePaginatedDashboardResource<T>({
  endpoint,
  fetchJson,
  query,
  pageSizeOptions = [10, 20, 25, 50, 100],
  enabled = true,
}: Params<T>): PaginatedHookState<T> {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(20)
  const [state, setState] = useState<PaginatedResponse<T>>({
    items: [],
    total: 0,
    totalPages: 1,
    updatedAt: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryIdentityKey = stableQueryKey(query)

  // eslint-disable-next-line react-hooks/exhaustive-deps -- el objeto `query` se compara por valor vía `queryIdentityKey`
  const queryString = useMemo(
    () => buildQueryString({ page, pageSize, ...query }),
    [page, pageSize, queryIdentityKey],
  )

  useEffect(() => {
    setPage(1)
  }, [queryIdentityKey])

  useEffect(() => {
    if (!enabled) {
      setLoading(true)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchJson<PaginatedResponse<T>>(`${endpoint}?${queryString}`)
      .then((body) => {
        if (cancelled) return
        setState({
          items: body.items || [],
          total: body.total || 0,
          totalPages: body.totalPages || 1,
          updatedAt: body.updatedAt || null,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setState({ items: [], total: 0, totalPages: 1, updatedAt: null })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, endpoint, fetchJson, queryString])

  const loadingMore = loading && state.items.length > 0

  return {
    ...state,
    loading,
    loadingMore,
    error,
    page,
    pageSize,
    setPage,
    setPageSize: (value: number) => {
      setPage(1)
      setPageSizeState(pageSizeOptions.includes(value) ? value : 20)
    },
    pageSizeOptions,
  }
}
