export function safeBaseUrl(value: string): string {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an http:// or https:// address')
  return url.toString().replace(/\/$/, '')
}

export function interval(task: () => Promise<void>, milliseconds: number): () => void {
  let disposed = false
  let timer = 0
  const run = async () => {
    if (disposed) return
    await task()
    if (!disposed) timer = window.setTimeout(run, milliseconds)
  }
  void run()
  return () => { disposed = true; window.clearTimeout(timer) }
}

export function seconds(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}
