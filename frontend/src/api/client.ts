import type { GridRequest, GridResponse, SimulateRequest, SimulateResponse } from './types'
import { mockGrid, mockSimulate } from '../physics/mock'

export type ApiMode = 'checking' | 'backend' | 'mock'

let mode: ApiMode = 'checking'
const listeners = new Set<(m: ApiMode) => void>()
const setMode = (m: ApiMode) => { if (m !== mode) { mode = m; listeners.forEach(l => l(m)) } }
export const onModeChange = (l: (m: ApiMode) => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const getMode = () => mode
const forceMock = import.meta.env.VITE_USE_MOCK === '1'

/** Endpoint che il backend non implementa ancora (404): per questi si usa il mock anche col backend collegato. */
const missing = new Set<string>()
const missingListeners = new Set<(m: string[]) => void>()
export const onMissingChange = (l: (m: string[]) => void) => { missingListeners.add(l); return () => { missingListeners.delete(l) } }
export const getMissing = () => [...missing]
const markMissing = (path: string) => {
  const key = path.split('?')[0]
  if (!missing.has(key)) { missing.add(key); missingListeners.forEach(l => l([...missing])) }
}

export class ApiError extends Error {}

export async function checkBackend(): Promise<ApiMode> {
  if (forceMock) { setMode('mock'); return 'mock' }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 1500)
    const r = await fetch('/api/health', { signal: ctrl.signal })
    clearTimeout(timer)
    const j = r.ok ? await r.json() : null
    setMode(j?.status === 'ok' ? 'backend' : 'mock')
  } catch { setMode('mock') }
  return mode
}

// Ricontrolla periodicamente: quando Antigravity avvia il backend, il frontend passa da solo ai dati veri.
export function startHealthPolling(ms = 5000) {
  void checkBackend()
  const id = setInterval(checkBackend, ms)
  return () => clearInterval(id)
}

async function call<T>(path: string, init: RequestInit | undefined, mock: () => T): Promise<T> {
  if (mode === 'checking') await checkBackend()
  if (mode === 'mock' || missing.has(path.split('?')[0])) {
    await new Promise(r => setTimeout(r, 0)) // lascia respirare la UI
    return mock()
  }
  let r: Response
  try {
    r = await fetch(path, init)
  } catch {
    setMode('mock')
    return mock()
  }
  if (r.status >= 500 && (await checkBackend()) === 'mock') return mock()
  if (r.status === 404 || r.status === 405) { markMissing(path); return mock() }
  if (!r.ok) {
    let msg = `Errore ${r.status}`
    try {
      const j = await r.json()
      if (typeof j.detail === 'string') msg = j.detail
      else if (Array.isArray(j.detail)) msg = j.detail.map((d: { msg?: string }) => d.msg).join('; ')
    } catch { /* risposta non JSON */ }
    throw new ApiError(msg)
  }
  return r.json() as Promise<T>
}

const post = (body: unknown): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

export const api = {
  simulate: (req: SimulateRequest) => call<SimulateResponse>('/api/simulate', post(req), () => mockSimulate(req)),
  grid: (req: GridRequest) => call<GridResponse>('/api/grid', post(req), () => mockGrid(req)),
}
