import { useCallback } from 'react'
import type { FetchJson } from '../types'

function errorMessageFromBody(body: unknown, res: Response): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message
    if (typeof m === 'string') return m
    return JSON.stringify(m ?? body) || `HTTP ${res.status}`
  }
  return JSON.stringify(body) || `HTTP ${res.status}`
}

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
    let body: unknown
    try {
      body = JSON.parse(text) as unknown
    } catch {
      body = { message: text || res.statusText }
    }
    if (!res.ok) {
      throw new Error(errorMessageFromBody(body, res))
    }
    return body as T
  }, [])
}
