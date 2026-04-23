export function buildQueryString(input: Record<string, string | number | boolean | Array<string> | null | undefined>): string {
  const params = new URLSearchParams()
  Object.entries(input).forEach(([key, value]) => {
    if (value == null || value === '') return
    if (Array.isArray(value)) {
      if (!value.length) return
      params.set(key, value.join(','))
      return
    }
    params.set(key, String(value))
  })
  return params.toString()
}
