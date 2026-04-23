import { useCallback } from 'react'
import type { FetchJson } from '../types'

function apiBase(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw === 'string' && raw.length) {
    return raw.replace(/\/$/, '')
  }
  return ''
}

export function useApiFetch(): FetchJson {
  return useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const base = apiBase()
    const url = base ? `${base}${path}` : path
    const res = await fetch(url, init)
    const text = await res.text()
    let body: any
    try {
      body = JSON.parse(text)
    } catch {
      body = { message: text || res.statusText }
    }
    if (!res.ok) {
      throw new Error(
        typeof body.message === 'string'
          ? body.message
          : JSON.stringify(body.message || body) || `HTTP ${res.status}`,
      )
    }
    return body as T
  }, [])
}
