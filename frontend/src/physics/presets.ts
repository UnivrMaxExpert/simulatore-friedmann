import type { Preset } from '../api/types'

/** Modelli predefiniti, presi dalle lezioni 1–3 (vedi cartella Teoria/ e Materiale/). */
export const LESSON_PRESETS: Preset[] = [
  { id: 'planck18', name: 'Universo attuale: materia + energia oscura, piatto', description: 'Il modello standard (ΛCDM, dati Planck 2018): circa 31 % materia (barionica + oscura) e 69 % energia oscura, spazio piatto. Età 13,8 miliardi di anni.', params: { H0: 67.66, omega_m: 0.3111, omega_r: 9e-5, omega_lambda: 0.6889, w: -1 } },
  { id: 'einstein_de_sitter', name: 'Solo materia, piatto (Ωm = 1, Λ = 0)', description: 'Piatto, senza energia oscura, solo materia (w = 0): a ∝ t^(2/3) ed età = 2/(3H₀) ≈ 9,3 miliardi di anni, meno dei 13,8 misurati.', params: { H0: 70, omega_m: 1, omega_r: 0, omega_lambda: 0, w: -1 } },
  { id: 'radiation', name: 'Solo radiazione, piatto (Ωr = 1)', description: 'Piatto, w = 1/3: a ∝ t^(1/2) ed età = 1/(2H₀). Si comporta così l\'universo primordiale.', params: { H0: 70, omega_m: 0, omega_r: 1, omega_lambda: 0, w: -1 } },
  { id: 'de_sitter', name: 'Solo energia oscura, piatto (ΩΛ = 1)', description: 'Solo costante cosmologica (Λ > 0): H costante e crescita esponenziale, a ∝ e^(Ht). Nessun Big Bang a tempo finito; è il comportamento dell\'inflazione e del nostro futuro.', params: { H0: 70, omega_m: 0, omega_r: 0, omega_lambda: 1, w: -1 } },
  { id: 'anti_de_sitter', name: 'Energia oscura negativa, aperto (ΩΛ = −0,5)', description: 'Costante cosmologica negativa (Λ < 0) con spazio aperto, k = −1: l\'espansione si arresta e l\'universo ricollassa.', params: { H0: 70, omega_m: 0, omega_r: 0, omega_lambda: -0.5, w: -1 } },
  { id: 'open_matter', name: 'Solo materia, aperto (Ωm = 0,3, Λ = 0)', description: 'k = −1, spazio iperbolico infinito: l\'espansione rallenta ma non si ferma.', params: { H0: 70, omega_m: 0.3, omega_r: 0, omega_lambda: 0, w: -1 } },
  { id: 'closed_matter', name: 'Solo materia, chiuso (Ωm = 3, Λ = 0)', description: 'k = +1, spazio finito come una sfera: l\'espansione si arresta e finisce nel Big Crunch.', params: { H0: 70, omega_m: 3, omega_r: 0, omega_lambda: 0, w: -1 } },
  { id: 'only_baryons', name: 'Solo materia visibile (Ωm = 0,03, Λ = 0)', description: 'Senza materia oscura né energia oscura: la sola materia barionica che vediamo, lontana dalla densità critica.', params: { H0: 70, omega_m: 0.03, omega_r: 0, omega_lambda: 0, w: -1 } },
]
