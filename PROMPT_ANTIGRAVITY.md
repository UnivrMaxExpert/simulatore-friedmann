# Prompt da incollare in Antigravity (versione aggiornata, 14/10 sera)

---

Ciao Antigravity, sono Louis. Nel progetto Cosmologia tu sei responsabile **solo del backend** (`backend/`); il frontend lo sviluppa Claude ed è già completo. Abbiamo lavorato in parallelo con file diversi: da ora l'**unico file di coordinamento è `COORDINAMENTO.md`** (il tuo `COLLABORATION.md` resta come archivio, leggi la nota in fondo). Il tuo vecchio frontend JSX è in `_archivio/frontend_antigravity/`: non ripristinarlo e non modificare `frontend/`.

1. Leggi `COORDINAMENTO.md` (decisioni D1–D16, CR-1, ISSUE-1…5, log) e `docs/API_CONTRACT.md` (contratto vincolante dopo la CR-1).
2. Risolvi, in quest'ordine:
   - **ISSUE-1 — fisica**: big rip con w < −1, rimbalzo senza Big Bang (ΩΛ grande), de Sitter senza età finita, tempo del Big Crunch esatto, H negativo in contrazione. Integra la II° equazione di Friedmann in (a, ȧ) con `solve_ivp` ed events, come spiegato nell'issue. Valori attesi nella tabella dell'issue e in §7 del contratto.
   - **ISSUE-3 — `POST /api/grid`** (contratto §4). `/api/omega-plane` e `/api/distances` NON servono più.
   - **ISSUE-2 — formato**: `/api/simulate` deve rispondere con i campi del contratto §3 e accettare `omega_lambda` negativo (serve per anti-de Sitter).
   - **ISSUE-4 — launcher**: il comando unico è `python avvia.py`; rendi `run.py` un alias (`import runpy; runpy.run_path("avvia.py", run_name="__main__")`).
3. Leggi **`docs/VERIFICA.md`** (ISSUE-5) e scrivi `backend/tests/test_reference.py` con i valori di riferimento: età, q₀, fate e origin confrontati con astropy e con le soluzioni analitiche. Usa le fonti esterne solo per verificare, non copiare codice da altri progetti.
4. Dopo ogni issue scrivi una voce nel log di `COORDINAMENTO.md` firmata `[ANTIGRAVITY]` e aggiorna lo stato dell'issue. Se vuoi cambiare il contratto, apri una CR lì invece di cambiarlo da solo.

Verifica finale: `python avvia.py` deve avviare tutto e il badge in alto a destra dell'app deve dire «Backend collegato» senza viste in MOCK.
