import type { Preset } from '../api/types'

/** Modelli predefiniti, presi dalle lezioni 1–3 (vedi cartella Teoria/ e Materiale/). */
export const LESSON_PRESETS: Preset[] = [
  { id: 'planck18', name: 'ΛCDM (Planck 2018)', description: 'Il modello standard: circa 31 % materia (barionica + oscura) e 69 % energia oscura, spazio piatto. Età 13,8 miliardi di anni.', params: { H0: 67.66, omega_m: 0.3111, omega_r: 9e-5, omega_lambda: 0.6889, w: -1 } },
  { id: 'einstein_de_sitter', name: 'Einstein–de Sitter (solo materia)', description: 'Piatto, Λ = 0, polvere (w = 0): a ∝ t^(2/3) e t₀ = 2/(3H₀) ≈ 9,3 miliardi di anni, meno dei 13,8 misurati.', params: { H0: 70, omega_m: 1, omega_r: 0, omega_lambda: 0, w: -1 } },
  { id: 'radiation', name: 'Solo radiazione', description: 'Piatto, w = 1/3: a ∝ t^(1/2) e t₀ = 1/(2H₀). È l\'universo primordiale.', params: { H0: 70, omega_m: 0, omega_r: 1, omega_lambda: 0, w: -1 } },
  { id: 'de_sitter', name: 'de Sitter (solo Λ > 0)', description: 'Solo costante cosmologica: H costante, a ∝ e^(Ht). Nessun Big Bang a tempo finito; è il comportamento dell\'inflazione e del nostro futuro.', params: { H0: 70, omega_m: 0, omega_r: 0, omega_lambda: 1, w: -1 } },
  { id: 'anti_de_sitter', name: 'Anti-de Sitter (Λ < 0)', description: 'Costante cosmologica negativa con curvatura k = −1: l\'espansione si arresta e l\'universo ricollassa.', params: { H0: 70, omega_m: 0, omega_r: 0, omega_lambda: -0.5, w: -1 } },
  { id: 'open_matter', name: 'Aperto, solo materia (Ω < 1)', description: 'k = −1, spazio iperbolico infinito: l\'espansione rallenta ma non si ferma.', params: { H0: 70, omega_m: 0.3, omega_r: 0, omega_lambda: 0, w: -1 } },
  { id: 'closed_matter', name: 'Chiuso, solo materia (Ω > 1)', description: 'k = +1, spazio finito come una sfera: l\'espansione si arresta e finisce nel Big Crunch.', params: { H0: 70, omega_m: 3, omega_r: 0, omega_lambda: 0, w: -1 } },
  { id: 'only_baryons', name: 'Solo materia visibile (Ωb ≈ 0,03)', description: 'Senza materia oscura né energia oscura: la sola materia barionica che vediamo, lontana dalla densità critica.', params: { H0: 70, omega_m: 0.03, omega_r: 0, omega_lambda: 0, w: -1 } },
]
