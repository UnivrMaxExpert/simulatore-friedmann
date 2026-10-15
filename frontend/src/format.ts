import type { Fate, Origin } from './api/types'

export const fmt = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : v.toLocaleString('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** numeri molto grandi/piccoli in notazione compatta */
export const fmtSmart = (v: number | null | undefined, digits = 3) => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const av = Math.abs(v)
  if (av !== 0 && (av >= 1e5 || av < 1e-3)) {
    const [m, e] = v.toExponential(digits - 1).split('e')
    return `${m.replace('.', ',')}·10${toSup(Number(e))}`
  }
  return v.toLocaleString('it-IT', { maximumSignificantDigits: digits })
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
export const toSup = (n: number) => String(n).split('').map(c => SUP[c] ?? c).join('')

export const FATE_LABEL: Record<Fate, string> = {
  big_crunch: 'Big Crunch',
  big_rip: 'Big Rip',
  accelerating_expansion: 'Espansione accelerata',
  eternal_expansion: 'Espansione eterna',
  static: 'Universo statico',
}

export const FATE_TEXT: Record<Fate, string> = {
  big_crunch: 'La gravità vince: l\'espansione si arresta e l\'universo ricollassa.',
  big_rip: 'L\'energia fantasma cresce senza limite e strappa lo spazio in un tempo finito.',
  accelerating_expansion: 'L\'energia oscura domina: l\'espansione accelera per sempre.',
  eternal_expansion: 'L\'espansione rallenta ma non si ferma mai.',
  static: 'Equilibrio instabile tra gravità e costante cosmologica.',
}

export const ORIGIN_LABEL: Record<Origin, string> = {
  big_bang: 'Big Bang',
  bounce: 'Rimbalzo',
  eternal_past: 'Passato infinito',
}

export const GEOMETRY_LABEL = { open: 'aperto', flat: 'piatto', closed: 'chiuso' } as const

// Tema "spazio profondo": fondo blu notte, luci stellari. Stessi colori nei grafici e nella scena 3D.
export const COLORS = {
  ink: '#E8ECF4', ink2: '#B7C0D0', muted: '#8790A3', line: '#222A3B', rail: '#323C52',
  blue: '#7AA2FF', red: '#FF6B6B', green: '#5BD6A0', amber: '#F2B263', violet: '#B48CFF', board: '#060A14',
  // componenti di densità — stessi colori in tutta l'app
  matter: '#7AA2FF', radiation: '#F2B263', lambda: '#B48CFF', curvature: '#8790A3',
}
