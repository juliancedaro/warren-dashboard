/** Props mínimas que Recharts pasa a `content` de `<Tooltip />`. */
export type RechartsTooltipProps<T = unknown> = {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: T }>
}
