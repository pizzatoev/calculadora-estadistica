import { useEffect, useMemo, useState } from 'react'
import {
  FUENTES_IA,
  ID_HUMANO,
  formatearPct,
  formatearProb,
  freqPalabraEnFuente,
  listarPalabrasTabla,
  palabraPorDefecto,
} from './corpusProbabilidad'
import { ValidacionRamasSuman1 } from './CatalogoBayes6.jsx'
import {
  FUENTES_RED,
  cadenaMarkovCapasDesdeRed,
  construirRedBayesiana,
  validarRedBayesiana,
} from './corpusRedBayesiana'

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
        className="w-full max-w-xs rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-[#E97F4A] focus:outline-none focus:ring-2 focus:ring-[#E97F4A]/30"
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

function NodoCirculo({ x, y, titulo, sub }) {
  return (
    <g>
      <circle cx={x} cy={y} r={28} fill="#fafafa" stroke="#374151" strokeWidth="1.5" />
      <text x={x} y={y - 2} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#374151">
        {titulo}
      </text>
      {sub ? (
        <text x={x} y={y + 12} textAnchor="middle" fontSize="8" fill="#E97F4A">
          {sub}
        </text>
      ) : null}
    </g>
  )
}

export default function RedBayesianaPanel({ resultado }) {
  const palabras = useMemo(() => listarPalabrasTabla(resultado.tabla_contingencia), [resultado])
  const [palabra, setPalabra] = useState('')

  useEffect(() => {
    setPalabra(palabraPorDefecto(resultado))
  }, [resultado])

  const red = useMemo(() => construirRedBayesiana(resultado, palabra), [resultado, palabra])
  const validacionRed = useMemo(() => validarRedBayesiana(red), [red])
  const cadena = useMemo(() => cadenaMarkovCapasDesdeRed(red), [red])

  const nIAenFila = FUENTES_IA.reduce((s, id) => s + freqPalabraEnFuente(red.fila, id), 0)
  const nHumanoFila = freqPalabraEnFuente(red.fila, ID_HUMANO)

  const w = 720
  const h = 320
  const x0 = 90
  const x1 = 320
  const x2 = 580
  const ysF = [70, 130, 190, 250]
  const yA = 120
  const yAbar = 200
  const yIA = 120
  const yH = 200

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#D66B38]">
        Red bayesiana (F1–F4 → A/Ā → IA/H)
      </p>
      <p className="mb-3 text-[9px] leading-snug text-gray-500">
        F1 = Humano, F2 = Copilot, F3 = DeepSeek, F4 = ChatGPT. A = palabra{' '}
        <strong className="text-[#D66B38]">{palabra}</strong> en la fuente. Probabilidades desde la
        tabla de contingencia.
      </p>

      <CampoSelect
        id="red-palabra"
        label="Palabra (evento A)"
        value={palabra}
        onChange={setPalabra}
        opciones={palabras.map((p) => ({ value: p, label: p }))}
      />

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto w-full min-w-[600px]" role="img">
          <text x={x0} y={24} textAnchor="middle" fontSize="10" fill="#2563EB" fontWeight="bold">
            Estado 0
          </text>
          <text x={x1} y={24} textAnchor="middle" fontSize="10" fill="#2563EB" fontWeight="bold">
            Estado 1
          </text>
          <text x={x2} y={24} textAnchor="middle" fontSize="10" fill="#2563EB" fontWeight="bold">
            Estado 2
          </text>

          <rect x={x0 - 55} y={40} width={110} height={240} fill="#FEF2F2" fillOpacity="0.5" rx={8} />
          <rect x={x1 - 55} y={40} width={110} height={240} fill="#FEF2F2" fillOpacity="0.5" rx={8} />
          <rect x={x2 - 55} y={40} width={110} height={240} fill="#FEF2F2" fillOpacity="0.5" rx={8} />

          {FUENTES_RED.map((fuente, i) => {
            const y = ysF[i]
            return (
              <g key={fuente.id}>
                <line x1={x0 + 28} y1={y} x2={x1 - 28} y2={yA} stroke="#93C5FD" strokeWidth="1.2" />
                <line x1={x0 + 28} y1={y} x2={x1 - 28} y2={yAbar} stroke="#93C5FD" strokeWidth="1.2" />
                <NodoCirculo
                  x={x0}
                  y={y}
                  titulo={fuente.f}
                  sub={red.pFi[fuente.id] != null ? formatearPct(red.pFi[fuente.id], 0) : ''}
                />
              </g>
            )
          })}

          <NodoCirculo x={x1} y={yA} titulo="A" sub={palabra?.slice(0, 8)} />
          <NodoCirculo x={x1} y={yAbar} titulo="Ā" sub="no A" />

          <line x1={x1 + 28} y1={yA} x2={x2 - 28} y2={yIA} stroke="#93C5FD" strokeWidth="1.2" />
          <line x1={x1 + 28} y1={yA} x2={x2 - 28} y2={yH} stroke="#93C5FD" strokeWidth="1.2" />
          <line x1={x1 + 28} y1={yAbar} x2={x2 - 28} y2={yIA} stroke="#D1D5DB" strokeWidth="1" strokeDasharray="3 2" />
          <line x1={x1 + 28} y1={yAbar} x2={x2 - 28} y2={yH} stroke="#D1D5DB" strokeWidth="1" strokeDasharray="3 2" />

          <NodoCirculo
            x={x2}
            y={yIA}
            titulo="IA"
            sub={red.pIADadoA != null ? `P(IA|A) ${formatearPct(red.pIADadoA, 0)}` : ''}
          />
          <NodoCirculo
            x={x2}
            y={yH}
            titulo="H"
            sub={red.pHDadoA != null ? `P(H|A) ${formatearPct(red.pHDadoA, 0)}` : ''}
          />
        </svg>
      </div>

      <ValidacionRamasSuman1
        titulo="Cada rama de la red suma 100 %"
        nota="Desde cada nodo, las probabilidades hacia sus hijos deben sumar 1 (CPT coherente)."
        ramas={validacionRed.ramas}
        todasOk={validacionRed.todasOk}
      />

      <div className="mt-3 grid gap-2 text-[10px] text-gray-600 sm:grid-cols-2">
        <div className="rounded-lg bg-neutral-50 p-2">
          <p className="font-bold text-gray-700">P(A | Fi)</p>
          {FUENTES_RED.map((f) => (
            <p key={f.id}>
              {f.f}: {formatearProb(red.pADadoFi[f.id])}
            </p>
          ))}
        </div>
        <div className="rounded-lg bg-neutral-50 p-2">
          <p className="font-bold text-gray-700">Dado A (aparece «{palabra}»)</p>
          <p>
            P(IA|A) = {formatearPct(red.pIADadoA)} — de las {red.origen?.sumaFila ?? 0} apariciones en
            la tabla, {nIAenFila} son de IA.
          </p>
          <p>
            P(H|A) = {formatearPct(red.pHDadoA)} — {nHumanoFila} son del texto humano.
          </p>
        </div>
        <div className="rounded-lg border border-[#F2C4A8]/60 bg-[#FFF6F0] p-2 sm:col-span-2">
          <p className="font-bold text-[#D66B38]">Marginal π(2) — misma cadena que Ej. 3</p>
          <p className="mt-1">
            P(IA) = <strong className="text-[#7C3AED]">{formatearPct(cadena.pi2[0])}</strong>, P(H) ={' '}
            <strong className="text-[#059669]">{formatearPct(cadena.pi2[1])}</strong>
          </p>
          <p className="mt-1 text-[9px] leading-snug text-gray-600">
            Combina «aparece la palabra» y «no aparece» en todo el corpus (Markov). No es lo mismo que
            P(IA|A): si la palabra es rara, π(2) se acerca al reparto general humano/IA del corpus.
          </p>
        </div>
      </div>
    </div>
  )
}
