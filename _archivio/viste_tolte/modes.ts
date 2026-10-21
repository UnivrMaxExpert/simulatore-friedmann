import type { SceneMode } from '../store/useStore'

export const SCENE_MODES: { id: SceneMode; label: string; hint: string }[] = [
  { id: 'space', label: 'Spazio curvo', hint: 'la geometria dello spazio (k = +1, 0, −1) che si dilata con a(t)' },
  { id: 'galaxies', label: 'Galassie e orizzonti', hint: 'legge di Hubble, raggio di Hubble e orizzonte della particella' },
  { id: 'surface', label: 'Superficie a(t)', hint: 'tutte le soluzioni al variare di un parametro' },
]
