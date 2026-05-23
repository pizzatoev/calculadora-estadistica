import { useEffect, useMemo, useState } from 'react'
import { BlockMath } from 'react-katex'
import { BadgeValidacionEstocastica } from './CatalogoBayes6.jsx'
import { formatearPct, formatearProb, listarPalabrasTabla, palabraPorDefecto } from './corpusProbabilidad'
import { construirRedBayesiana, cadenaMarkovCapasDesdeRed } from './corpusRedBayesiana'

function CampoSelect({ id, label, value, onChange, opciones }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-xs rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#E97F4A] focus:outline-none focus:ring-2 focus:ring-[#E97F4A]/30"
      >
        {opciones.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Procedimiento vertical como en la pizarra del ingeniero. */
function ProcedimientoPizarra({ bloques, palabra }) {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-neutral-800/10 bg-[#FAFAF8] shadow-inner">
      <div className="border-b border-neutral-200/80 bg-neutral-900 px-4 py-2.5">
        <h3 className="text-center text-sm font-bold tracking-wide text-white">Cadenas de Markov</h3>
        <p className="mt-0.5 text-center text-[10px] text-neutral-300">
          Palabra A = «{palabra}» · F1–F4 = fuentes · π(nuevo) = π(anterior) × P
        </p>
      </div>

      <div className="space-y-0 divide-y divide-neutral-200/60 px-3 py-4 sm:px-5">
        {bloques.map((bloque, i) => (
          <div key={bloque.id} className="py-4 first:pt-2">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#D66B38]">
              {i + 1}. {bloque.etiqueta}
            </p>
            <div className="overflow-x-auto rounded-xl border border-neutral-200/80 bg-white px-3 py-4 shadow-sm [&_.katex-display]:!my-0 [&_.katex]:text-[13px] sm:[&_.katex]:text-sm">
              <BlockMath math={bloque.math} />
            </div>
            {bloque.nota ? (
              <p className="mt-2 text-[10px] italic text-gray-500">{bloque.nota}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function LeyendaRedMarkov() {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 px-3 py-2 text-[10px] text-gray-600">
      <p className="font-bold text-gray-700">Correspondencia con la red (pizarra)</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5">
        <li>
          <strong>π(0)</strong>: capa F1–F4 (en el diagrama: A, B, C, D) — probabilidad de cada fuente.
        </li>
        <li>
          <strong>P₁, π(1)</strong>: capa palabra — estados A y Ā (Fostering en el diagrama).
        </li>
        <li>
          <strong>P₂, π(2)</strong>: capa estilo — I (IA) y H (Humano).
        </li>
      </ul>
    </div>
  )
}

function interpretacionPi2(palabra, pi2) {
  const pIA = pi2[0] ?? 0
  const pH = pi2[1] ?? 0
  const w = palabra || 'esta palabra'

  if (Math.abs(pIA - pH) < 0.05) {
    return `Para «${w}», hay un ${formatearPct(pH)} de probabilidad de texto humano y un ${formatearPct(pIA)} de IA — casi iguales.`
  }
  if (pIA > pH) {
    return `Para «${w}», hay un ${formatearPct(pIA)} de probabilidad de que sea texto de IA, frente a un ${formatearPct(pH)} de texto humano.`
  }
  return `Para «${w}», hay un ${formatearPct(pH)} de probabilidad de que sea texto humano, frente a un ${formatearPct(pIA)} de texto de IA.`
}

function ResultadoFinalMarkov({ palabra, pi2, validacion }) {
  return (
    <div className="rounded-xl border border-[#E97F4A]/40 bg-[#FFF6F0] px-3 py-3">
      <p className="text-[10px] font-bold text-[#D66B38]">Lectura del vector resultado π(2)</p>
      <p className="mt-1 text-xs text-gray-700">
        π(2) = [{formatearProb(pi2[0], 4)}, {formatearProb(pi2[1], 4)}] → P(IA) ={' '}
        <strong className="text-[#7C3AED]">{formatearPct(pi2[0])}</strong>, P(H) ={' '}
        <strong className="text-[#059669]">{formatearPct(pi2[1])}</strong>
        {palabra ? ` (palabra «${palabra}»)` : ''}
      </p>
      {validacion?.ok && (
        <p className="mt-1 text-[10px] text-emerald-700">Σ π(2) = 1 ✓</p>
      )}
      <p className="mt-2 border-t border-[#F2C4A8]/50 pt-2 text-xs italic leading-snug text-gray-600">
        {interpretacionPi2(palabra, pi2)}
      </p>
    </div>
  )
}

export default function MarkovEjercicio({ resultado }) {
  const palabras = useMemo(() => listarPalabrasTabla(resultado.tabla_contingencia), [resultado])
  const [palabra, setPalabra] = useState('')

  useEffect(() => {
    setPalabra(palabraPorDefecto(resultado))
  }, [resultado])

  const red = useMemo(() => construirRedBayesiana(resultado, palabra), [resultado, palabra])
  const cadena = useMemo(() => cadenaMarkovCapasDesdeRed(red), [red])

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        <strong>Ejercicio 3.</strong> Mismo procedimiento que en la pizarra: escribes π(0), la matriz P,
        multiplicas y obtienes el siguiente vector hasta π(2).
      </p>

      <CampoSelect
        id="ej3-palabra-red"
        label="Palabra (evento A)"
        value={palabra}
        onChange={setPalabra}
        opciones={palabras.map((p) => ({ value: p, label: p }))}
      />

      <LeyendaRedMarkov />

      <ProcedimientoPizarra bloques={cadena.procedimientoPizarra} palabra={cadena.palabra} />

      <ResultadoFinalMarkov
        palabra={cadena.palabra}
        pi2={cadena.pi2}
        validacion={cadena.validacion.pi2}
      />

      {cadena.validacion.todasOk && <BadgeValidacionEstocastica validacion={{ ok: true, suma: 1 }} />}
    </div>
  )
}
