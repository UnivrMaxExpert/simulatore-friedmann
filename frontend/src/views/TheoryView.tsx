import katex from 'katex'
import { useStore, type SceneMode } from '../store/useStore'

const M = ({ t, block }: { t: string; block?: boolean }) => (
  <span dangerouslySetInnerHTML={{ __html: katex.renderToString(t, { displayMode: !!block, throwOnError: false }) }} />
)

/** Pulsante che carica un modello nel simulatore */
function Try({ preset, scene, children }: { preset: string; scene?: SceneMode; children: string }) {
  const tryModel = useStore(s => s.tryModel)
  return <button className="btn" onClick={() => tryModel(preset, scene)}>{children}</button>
}

export default function TheoryView() {
  return (
    <div className="view-scroll">
      <article className="theory">
        <h2>Cosa risolve il simulatore</h2>
        <p>
          Su grande scala l'universo è omogeneo e isotropo (principio cosmologico). Allora la sua storia è tutta in una funzione del tempo,
          il fattore di scala <M t="a(t)" />, normalizzato a <M t="a(t_0)=1" /> oggi. Il simulatore la calcola risolvendo le equazioni di Friedmann
          per i parametri che scegli, e la mostra in 3D.
        </p>

        <h3>1. Metrica di Robertson–Walker e curvatura</h3>
        <M block t="ds^2 = c^2dt^2 - a^2(t)\left[\frac{dr^2}{1-kr^2} + r^2 d\Omega^2\right], \qquad k \in \{-1,\,0,\,+1\}" />
        <p className="where">
          k = 0 spazio piatto (euclideo, infinito), k = +1 chiuso (come una sfera: finito), k = −1 aperto (come una sella: infinito).
          Le galassie hanno coordinate comoventi r fisse; la loro distanza fisica è <M t="d = a(t)\,r" />.
        </p>
        <div className="try">
          <Try preset="closed_matter">Chiuso, k = +1</Try>
          <Try preset="planck18">Piatto, k = 0</Try>
          <Try preset="open_matter">Aperto, k = −1</Try>
        </div>

        <h3>2. Le equazioni di Friedmann</h3>
        <M block t="\text{I}\quad \left(\frac{\dot a}{a}\right)^2 = \frac{8\pi G}{3}\rho - \frac{kc^2}{a^2}" />
        <M block t="\text{II}\quad \frac{\ddot a}{a} = -\frac{4\pi G}{3}\left(\rho + \frac{3p}{c^2}\right)" />
        <M block t="\text{III}\quad \dot\rho = -3\,\frac{\dot a}{a}\left(\rho + \frac{p}{c^2}\right)" />
        <p className="where">
          Con il fluido perfetto <M t="p = w\rho c^2" /> la III° si integra: <M t="\rho \propto a^{-3(1+w)}" />. Polvere (materia, w = 0)
          <M t="\;\rho\propto a^{-3}" />, radiazione (w = 1/3) <M t="\;\rho\propto a^{-4}" />, costante cosmologica (w = −1) <M t="\;\rho" /> costante.
        </p>

        <h3>3. Hubble, densità critica, Ω</h3>
        <M block t="H \equiv \frac{\dot a}{a}, \qquad \rho_c \equiv \frac{3H^2}{8\pi G}, \qquad \Omega \equiv \frac{\rho}{\rho_c} \quad\Longrightarrow\quad \Omega - 1 = \frac{kc^2}{a^2H^2}" />
        <p className="where">
          Quindi <M t="\operatorname{sgn}(\Omega-1) = \operatorname{sgn} k" />: Ω &gt; 1 chiuso, Ω = 1 piatto, Ω &lt; 1 aperto, e il segno non cambia nel tempo.
          Oggi <M t="\rho_{c,0} = 1{,}88\,h^2\cdot10^{-29}\ \text{g/cm}^3" />. La materia visibile dà <M t="\Omega_b\approx0{,}03" />, con la materia oscura
          <M t="\;\Omega_M\approx0{,}27" />: eppure l'universo appare piatto, Ω ≈ 1.
        </p>
        <div className="try"><Try preset="only_baryons">Solo materia visibile</Try></div>

        <h3>4. Modelli piatti senza Λ e il Big Bang</h3>
        <M block t="k = 0,\ \Lambda = 0: \qquad a(t) \propto t^{\frac{2}{3(1+w)}}, \qquad H(t) = \frac{2}{3(1+w)}\,\frac{1}{t}" />
        <p className="where">
          Se <M t="1+3w>0" /> la II° dà <M t="\ddot a<0" />: la curva a(t) è concava e, andando indietro, tocca a = 0 in un tempo finito.
          Lì ρ → ∞ e H → ∞: è la singolarità del <b>Big Bang</b>, dovuta alle condizioni iniziali e non alla pressione.
        </p>
        <table className="table">
          <thead><tr><th>fluido</th><th>w</th><th>a(t)</th><th>età t₀</th></tr></thead>
          <tbody>
            <tr><td>materia (polvere)</td><td>0</td><td>t^(2/3)</td><td>2/(3H₀) ≈ 9,3 Gyr (h = 0,7)</td></tr>
            <tr><td>radiazione</td><td>1/3</td><td>t^(1/2)</td><td>1/(2H₀) ≈ 7,0 Gyr</td></tr>
          </tbody>
        </table>
        <p className="note">
          Il problema dell'età: con la sola materia l'universo avrebbe circa 9–10 miliardi di anni, ma le misure dicono 13,8.
          Servono curvatura o altre componenti: l'energia oscura. Confronta i due modelli con il pulsante «Aggiungi il modello al confronto».
        </p>
        <div className="try">
          <Try preset="einstein_de_sitter">Solo materia, piatto</Try>
          <Try preset="radiation">Solo radiazione</Try>
          <Try preset="planck18">Universo attuale</Try>
        </div>

        <h3>5. La costante cosmologica</h3>
        <p>
          Einstein cercava un universo <b>statico</b>: con <M t="\ddot a = 0" /> la II° chiede <M t="\rho = -3p/c^2" />, impossibile con un fluido
          ordinario. Aggiunse allora Λ alle equazioni di campo, che equivale a un fluido con w = −1 e <M t="\rho_\Lambda = \Lambda c^2/8\pi G" />.
          L'equilibrio è però instabile, e con la scoperta dell'espansione Einstein lo definì «il più grande errore della mia vita».
        </p>
        <M block t="\Lambda > 0,\ \text{solo vuoto}: \quad H = c\sqrt{\Lambda/3} = \text{cost}, \qquad a(t) \propto e^{Ht} \quad \text{(de Sitter)}" />
        <p className="where">
          Con Λ &lt; 0 si ha l'universo di anti-de Sitter, che si ferma e ricollassa. Un'espansione esponenziale come quella di de Sitter è
          l'inflazione dell'universo primordiale, ed è anche il futuro del nostro universo.
          Un universo esattamente statico ha H₀ = 0, quindi non si può impostare con i parametri di oggi del simulatore.
        </p>
        <div className="try">
          <Try preset="de_sitter">Solo energia oscura (Λ &gt; 0)</Try>
          <Try preset="anti_de_sitter">Energia oscura negativa (Λ &lt; 0)</Try>
        </div>

        <h3>6. Energia oscura ed espansione accelerata</h3>
        <M block t="\ddot a > 0 \iff \rho + \frac{3p}{c^2} < 0 \iff w < -\frac{1}{3}" />
        <p className="where">
          Le supernovae mostrano che oggi l'espansione accelera; CMB e dinamica degli ammassi indicano che circa il 70 % della densità è energia oscura.
          Il parametro di decelerazione <M t="q = -\ddot a a / \dot a^2" /> diventa negativo: nel grafico q(t) del simulatore si vede quando succede.
        </p>

        <h3>7. Modelli curvi</h3>
        <p>
          Senza Λ, la curvatura decide il destino: Ω &lt; 1 si espande per sempre, Ω = 1 al limite, Ω &gt; 1 raggiunge un massimo e ricollassa
          nel <b>Big Crunch</b>. Un universo chiuso è più giovane di uno piatto, che è più giovane di uno aperto.
        </p>
        <div className="try">
          <Try preset="open_matter">Ω &lt; 1</Try>
          <Try preset="einstein_de_sitter">Ω = 1</Try>
          <Try preset="closed_matter">Ω &gt; 1, Big Crunch</Try>
        </div>

        <h3>8. Redshift e tempo</h3>
        <M block t="1 + z = \frac{\lambda_o}{\lambda_e} = \frac{a(t_0)}{a(t_e)}, \qquad v = H_0\,d" />
        <p className="where">
          Dal redshift di un fotone risalgo all'epoca in cui è stato emesso: per la materia <M t="t = t_0(1+z)^{-3/2}" />.
          La linea del tempo del simulatore mostra z per ogni istante.
        </p>

        <h3>9. Orizzonte della particella e raggio di Hubble</h3>
        <M block t="\chi_p(t) = c\int_0^{t}\frac{dt'}{a(t')}, \qquad r_H = \frac{c}{a H} = \frac{c}{\dot a}" />
        <p className="where">
          Il cono luce è «tagliato» dal Big Bang: possiamo ricevere segnali solo dentro l'orizzonte della particella, che cresce col tempo.
          Oltre il raggio di Hubble la velocità di recessione supera c. Regioni opposte del fondo cosmico hanno la stessa temperatura pur non
          essendo mai state in contatto (problema dell'orizzonte): lo risolve l'inflazione, durante la quale il raggio di Hubble comovente si restringe.
          Nel simulatore si vedono entrambe le sfere attorno a noi.
        </p>
        <div className="try">
          <Try preset="planck18">Orizzonti nell'universo attuale</Try>
          <Try preset="de_sitter">Solo energia oscura: crescita esponenziale</Try>
        </div>

        <h3>10. Come lo calcola</h3>
        <p className="where">
          Dalla I° si ricava <M t="\dot a = H_0\, a\sqrt{E^2(a)}" />, con <M t="E^2 = \Omega_r a^{-4} + \Omega_m a^{-3} + \Omega_k a^{-2} + \Omega_\Lambda a^{-3(1+w)}" />,
          ma questa forma non sa cambiare segno: in un universo chiuso si blocca nel punto di inversione. Il simulatore integra invece la II°
          come sistema in <M t="(a,\dot a)" />, partendo da oggi (a = 1, ȧ = H₀) all'indietro fino al Big Bang e in avanti nel futuro.
        </p>
        <M block t="\ddot a = -\frac{H_0^2}{2}\left[2\Omega_r a^{-3} + \Omega_m a^{-2} + (1+3w)\,\Omega_\Lambda a^{-2-3w}\right]" />
      </article>
    </div>
  )
}
