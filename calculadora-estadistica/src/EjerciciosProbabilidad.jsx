import { useEffect, useMemo, useState } from 'react'
import CampoSelect from './CampoSelect.jsx'
import CatalogoBayes6, { ValidacionRamasSuman1 } from './CatalogoBayes6.jsx'
import { validarArbolDecision } from './corpusRedBayesiana'
import RedBayesianaPanel from './RedBayesianaPanel.jsx'
import MarkovEjercicio from './MarkovEjercicio.jsx'
import { BlockMath, InlineMath } from 'react-katex'
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react'
import {
  FUENTES_IA,
  ID_HUMANO,
  extraerTotalesTablaContingencia,
  palabrasDefectoCatalogo,
  formatearPct,
  formatearProb,
  listarPalabrasTabla,
  palabraPorDefecto,
  probabilidadCondicionalPalabraIA,
  probabilidadFuenteDadoPalabra,
  probabilidadPalabraMarginal,
  validarEjercicio2Bayes,
  validarSumaProbabilidades,
} from './corpusProbabilidad'

const ETIQUETAS = {
  humano: 'Humano',
  copilot: 'Copilot',
  deepseek: 'DeepSeek',
  chatgpt: 'ChatGPT',
}

function ValidacionProbabilidades({ titulo, items, todasOk }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        todasOk
          ? 'border-emerald-200 bg-emerald-50/90'
          : 'border-amber-200 bg-amber-50/90'
      }`}
      role="status"
      aria-live="polite"
    >
      <p
        className={`mb-3 flex items-center gap-2 text-xs font-bold ${
          todasOk ? 'text-emerald-800' : 'text-amber-900'
        }`}
      >
        {todasOk ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {titulo}
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <ValidacionFila key={item.id} {...item} />
        ))}
      </ul>
    </div>
  )
}

function ValidacionFila({ etiqueta, validacion, explicacion, significado }) {
  const { suma, ok } = validacion ?? { suma: 0, ok: false }
  const [mostrarAyuda, setMostrarAyuda] = useState(false)

  return (
    <li className="rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-800">{etiqueta}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Suma numérica: <span className="font-mono font-medium">{formatearPct(suma)}</span>
            {!ok && validacion?.desviacion != null && (
              <span className="text-amber-700">
                {' '}
                (desviación {validacion.desviacion > 0 ? '+' : ''}
                {formatearPct(validacion.desviacion)})
              </span>
            )}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
          }`}
          title={ok ? 'Las probabilidades suman 100 %: modelo coherente.' : 'La suma no es 100 %: revisar datos o redondeo.'}
        >
          {ok ? '✓ 100 %' : '⚠ Revisar'}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-gray-600">{explicacion}</p>
      <button
        type="button"
        onClick={() => setMostrarAyuda((v) => !v)}
        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#D66B38] hover:text-[#E97F4A]"
        aria-expanded={mostrarAyuda}
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        {mostrarAyuda ? 'Ocultar significado' : '¿Qué significa para el docente?'}
      </button>
      {mostrarAyuda && (
        <p className="mt-1.5 rounded-lg border border-[#F2C4A8]/40 bg-[#FFF6F0]/80 px-2.5 py-2 text-[11px] leading-relaxed text-gray-700">
          {significado}
        </p>
      )}
    </li>
  )
}

function CajaResultado({ titulo, children, destacado = false }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        destacado
          ? 'border-[#E97F4A]/40 bg-[#FFF6F0]'
          : 'border-neutral-100 bg-neutral-50/80'
      }`}
    >
      {titulo ? (
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#D66B38]">{titulo}</p>
      ) : null}
      {children}
    </div>
  )
}

function BadgeValidacionEstocastica({ validacion }) {
  if (validacion?.ok) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-800 ring-1 ring-emerald-200/90">
        ✓ Validación estocástica exitosa (∑ P = 1.00)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-900 ring-1 ring-amber-200/90">
      ⚠ Revisar partición (∑ P = {formatearPct(validacion?.suma ?? 0)})
    </span>
  )
}

const FUENTES_TABLA = [ID_HUMANO, ...FUENTES_IA]

function ResultadoProbSimple({ calc, etiquetaFormula }) {
  if (calc.valor === null) {
    return <p className="text-sm text-amber-800">No hay datos suficientes en la tabla.</p>
  }
  return (
    <>
      <div className="space-y-2 text-sm [&_.katex]:text-base">
        <BlockMath math={etiquetaFormula} />
      </div>
      <p className="mt-3 text-lg font-bold text-[#E97F4A]">
        Resultado: {formatearPct(calc.valor)}{' '}
        <span className="text-sm font-normal text-gray-500">({formatearProb(calc.valor)})</span>
      </p>
    </>
  )
}

function Ejercicio1ProbabilidadSimple({ resultado }) {
  const palabras = useMemo(() => listarPalabrasTabla(resultado.tabla_contingencia), [resultado])
  const [palabra, setPalabra] = useState('')
  const [iaId, setIaId] = useState(FUENTES_IA[0])
  const [fuenteId, setFuenteId] = useState(FUENTES_IA[0])

  useEffect(() => {
    setPalabra(palabraPorDefecto(resultado))
    setIaId(FUENTES_IA[0])
    setFuenteId(FUENTES_IA[0])
  }, [resultado])

  const calc1 = useMemo(
    () => probabilidadCondicionalPalabraIA(resultado, palabra, iaId),
    [resultado, palabra, iaId],
  )
  const calc2 = useMemo(
    () => probabilidadFuenteDadoPalabra(resultado, palabra, fuenteId),
    [resultado, palabra, fuenteId],
  )
  const calc3 = useMemo(() => probabilidadPalabraMarginal(resultado, palabra), [resultado, palabra])

  const etiquetaIA = ETIQUETAS[iaId] ?? iaId
  const etiquetaFuente = ETIQUETAS[fuenteId] ?? fuenteId

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 px-3 py-2.5 text-sm text-gray-600">
        <p>
          <strong>Ejercicio 1.</strong> Tres probabilidades simples (lectura directa de la tabla de
          contingencia generada automáticamente).
        </p>
      </div>

      <CampoSelect
        id="ej1-palabra"
        label="Seleccione una Palabra"
        value={palabra}
        onChange={setPalabra}
        opciones={palabras.map((p) => ({ value: p, label: p }))}
      />

      <TablaContingenciaCompacta tabla={resultado.tabla_contingencia} palabraActiva={palabra} />

      <CajaResultado titulo="1.1 - P(palabra | herramienta IA)" destacado>
        <p className="mb-2 text-xs text-gray-500">
          Condicional por <strong>columna</strong>: dado que el texto proviene de una herramienta
          concreta (no “IA” en conjunto).
        </p>
        <CampoSelect
          id="ej1-ia"
          label="Herramienta IA"
          value={iaId}
          onChange={setIaId}
          opciones={FUENTES_IA.map((id) => ({ value: id, label: ETIQUETAS[id] }))}
        />
        <p className="mb-3 mt-3 text-sm text-gray-700">
          Si elegimos al azar una palabra del conjunto de la tabla y sabemos que proviene de{' '}
          <strong>{etiquetaIA}</strong>, ¿cuál es la probabilidad de que sea{' '}
          <strong className="text-[#D66B38]">{palabra || '—'}</strong>?
        </p>
        <ResultadoProbSimple
          calc={calc1}
          etiquetaFormula={`P(${texPalabra(palabra)} \\mid ${texEtiqueta(etiquetaIA)}) = \\frac{f(${texPalabra(palabra)},\\, ${texEtiqueta(etiquetaIA)})}{N_{${texEtiqueta(etiquetaIA)}}} = \\frac{${calc1.numerador}}{${calc1.denominador}} ${calc1.valor !== null ? `= ${formatearProb(calc1.valor)}` : ''}`}
        />
        <p className="mt-2 text-xs text-gray-500">
          <InlineMath math="N_{\text{columna}}" /> = total de la columna en la tabla.
        </p>
      </CajaResultado>

      <CajaResultado titulo="1.2 - P(fuente | palabra)">
        <p className="mb-2 text-xs text-gray-500">
          Condicional por <strong>fila</strong>: ya observamos la palabra; ¿de qué fuente proviene?
        </p>
        <CampoSelect
          id="ej1-fuente"
          label="Fuente"
          value={fuenteId}
          onChange={setFuenteId}
          opciones={FUENTES_TABLA.map((id) => ({ value: id, label: ETIQUETAS[id] }))}
        />
        <p className="mb-3 mt-3 text-sm text-gray-700">
          Si la palabra observada es <strong className="text-[#D66B38]">{palabra || '—'}</strong>,
          ¿cuál es la probabilidad de que provenga de <strong>{etiquetaFuente}</strong>?
        </p>
        <ResultadoProbSimple
          calc={calc2}
          etiquetaFormula={`P(${texEtiqueta(etiquetaFuente)} \\mid ${texPalabra(palabra)}) = \\frac{f(${texPalabra(palabra)},\\, ${texEtiqueta(etiquetaFuente)})}{N_{\\text{fila}(${texPalabra(palabra)})}} = \\frac{${calc2.numerador}}{${calc2.denominador}} ${calc2.valor !== null ? `= ${formatearProb(calc2.valor)}` : ''}`}
        />
        <p className="mt-2 text-xs text-gray-500">
          <InlineMath math="N_{\text{fila}}" /> = total de la fila (columna Total).
        </p>
      </CajaResultado>

      <CajaResultado titulo="1.3 - P(palabra)">
        <p className="mb-3 text-sm text-gray-700">
          Sin condicionar la fuente: si tomamos al azar una palabra del vocabulario de la tabla,
          ¿cuál es la probabilidad de que sea{' '}
          <strong className="text-[#D66B38]">{palabra || '—'}</strong>?
        </p>
        <ResultadoProbSimple
          calc={calc3}
          etiquetaFormula={`P(${texPalabra(palabra)}) = \\frac{N_{\\text{fila}(${texPalabra(palabra)})}}{N_{\\text{tabla}}} = \\frac{${calc3.numerador}}{${calc3.denominador}} ${calc3.valor !== null ? `= ${formatearProb(calc3.valor)}` : ''}`}
        />
        <p className="mt-2 text-xs text-gray-500">
          <InlineMath math="N_{\text{tabla}}" /> = gran total de la tabla de contingencia.
        </p>
      </CajaResultado>
    </div>
  )
}


function Ejercicio2Bayes({ resultado }) {
  const marg = useMemo(
    () => extraerTotalesTablaContingencia(resultado.tabla_contingencia),
    [resultado],
  )
  const pIA = marg.totalGeneral > 0 ? marg.totalIA / marg.totalGeneral : 0
  const pHumano = marg.totalGeneral > 0 ? marg.totalHumano / marg.totalGeneral : 0

  const [arbolPalabra, setArbolPalabra] = useState('')
  const [arbolFuente, setArbolFuente] = useState(ID_HUMANO)

  useEffect(() => {
    const defs = palabrasDefectoCatalogo(resultado)
    setArbolPalabra(defs[0] ?? palabraPorDefecto(resultado))
    setArbolFuente(ID_HUMANO)
  }, [resultado])

  const palabrasLista = listarPalabrasTabla(resultado.tabla_contingencia)

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        <strong>Ejercicio 2.</strong> Seis probabilidades condicionales con Bayes (tabla de
        contingencia), árbol de profundidad 3 y exploración por combobox.
      </p>

      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Árbol</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoSelect
          id="ej2-arbol-palabra"
          label="Palabra (árbol)"
          value={arbolPalabra}
          onChange={setArbolPalabra}
          opciones={palabrasLista.map((p) => ({ value: p, label: p }))}
        />
        <CampoSelect
          id="ej2-arbol-fuente"
          label="Fuente (árbol)"
          value={arbolFuente}
          onChange={setArbolFuente}
          opciones={FUENTES_TABLA.map((id) => ({ value: id, label: ETIQUETAS[id] }))}
        />
      </div>

      <ArbolBayesSVG
        resultado={resultado}
        palabra={arbolPalabra}
        fuenteId={arbolFuente}
        pHumano={pHumano}
        pIA={pIA}
        marg={marg}
      />

      <CatalogoBayes6 resultado={resultado} />

      <RedBayesianaPanel resultado={resultado} />
    </div>
  )
}

function ArbolBayesSVG({ resultado, palabra, fuenteId, pHumano, pIA, marg }) {
  const w = 820
  const h = 380
  const boxW = 96
  const boxH = 48
  const halfW = boxW / 2
  const halfH = boxH / 2

  const pCopIA = pIA > 0 ? marg.porFuente.copilot / marg.totalIA : 0
  const pDeepIA = pIA > 0 ? marg.porFuente.deepseek / marg.totalIA : 0
  const pGptIA = pIA > 0 ? marg.porFuente.chatgpt / marg.totalIA : 0

  const pPalabraFuente = useMemo(() => {
    const r = probabilidadCondicionalPalabraIA(resultado, palabra, fuenteId)
    return r.valor
  }, [resultado, palabra, fuenteId])

  const coords = {
    raiz: { x: 58, y: h / 2 },
    l1_humano: { x: 210, y: 72 },
    l1_ia: { x: 210, y: h - 72 },
    humano_orig: { x: 420, y: 72 },
    copilot: { x: 420, y: 138 },
    deepseek: { x: 420, y: h / 2 },
    chatgpt: { x: 420, y: h - 138 },
    palabra: { x: w - 100, y: h / 2 },
  }

  const rutaActiva = useMemo(() => {
    if (fuenteId === ID_HUMANO) {
      return new Set(['raiz', 'l1_humano', 'humano_orig', 'palabra'])
    }
    return new Set(['raiz', 'l1_ia', fuenteId, 'palabra'])
  }, [fuenteId])

  const enRuta = (id) => rutaActiva.has(id)

  const labelPalabra = useMemo(() => {
    if (pPalabraFuente == null) return null
    return formatearPct(pPalabraFuente, 0)
  }, [pPalabraFuente])

  const validacionArbol = useMemo(() => validarArbolDecision(marg), [marg])

  const aristas = [
    { from: 'raiz', to: 'l1_humano', label: formatearPct(pHumano, 0) },
    { from: 'raiz', to: 'l1_ia', label: formatearPct(pIA, 0) },
    { from: 'l1_humano', to: 'humano_orig', label: '100 %' },
    { from: 'l1_ia', to: 'copilot', label: formatearPct(pCopIA, 0) },
    { from: 'l1_ia', to: 'deepseek', label: formatearPct(pDeepIA, 0) },
    { from: 'l1_ia', to: 'chatgpt', label: formatearPct(pGptIA, 0) },
    { from: 'humano_orig', to: 'palabra', label: null },
    { from: 'copilot', to: 'palabra', label: null },
    { from: 'deepseek', to: 'palabra', label: null },
    { from: 'chatgpt', to: 'palabra', label: null },
  ]

  const aristaEnRuta = (e) => {
    if (e.to === 'palabra') return enRuta(e.from)
    if (e.from === 'raiz') return enRuta(e.to)
    if (e.from === 'l1_humano') return enRuta('humano_orig')
    if (e.from === 'l1_ia') return enRuta(e.to)
    return false
  }

  const dibujarArista = (e, soloActiva = false) => {
    const activa = aristaEnRuta(e)
    if (soloActiva && !activa) return null
    if (!soloActiva && activa) return null

    const a = coords[e.from]
    const b = coords[e.to]
    const x1 = a.x + halfW
    const y1 = a.y
    const x2 = b.x - halfW
    const y2 = b.y
    const mx = (x1 + x2) / 2
    const label =
      e.to === 'palabra' && activa && labelPalabra
        ? labelPalabra
        : e.label

    return (
      <g key={`${soloActiva ? 'a-' : 'i-'}${e.from}-${e.to}`}>
        <path
          d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
          fill="none"
          stroke={activa ? '#E97F4A' : '#d1d5db'}
          strokeWidth={activa ? 2.5 : 1.25}
          strokeDasharray={activa ? undefined : '4 3'}
        />
        {label ? (
          <text
            x={mx}
            y={(y1 + y2) / 2 - 6}
            textAnchor="middle"
            fontSize="9"
            fill={activa ? '#9a3412' : '#9ca3af'}
            fontWeight={activa ? 'bold' : 'normal'}
          >
            {label}
          </text>
        ) : null}
      </g>
    )
  }

  const nodoBox = (id, titulo, subtitulo) => {
    const { x, y } = coords[id]
    const activo = enRuta(id)
    return (
      <g key={id}>
        <rect
          x={x - halfW}
          y={y - halfH}
          width={boxW}
          height={boxH}
          rx={10}
          fill={activo ? '#FFF6F0' : '#fafafa'}
          stroke={activo ? '#E97F4A' : '#e5e7eb'}
          strokeWidth={activo ? 2 : 1}
        />
        <text
          x={x}
          y={subtitulo ? y - 5 : y + 1}
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill={activo ? '#9a3412' : '#6b7280'}
        >
          {titulo}
        </text>
        {subtitulo ? (
          <text x={x} y={y + 11} textAnchor="middle" fontSize="9" fill={activo ? '#E97F4A' : '#9ca3af'}>
            {subtitulo}
          </text>
        ) : null}
      </g>
    )
  }

  const nodos = [
    { id: 'raiz', titulo: 'Autor', sub: null },
    { id: 'l1_humano', titulo: 'Humano', sub: formatearPct(pHumano, 0) },
    { id: 'l1_ia', titulo: 'IA', sub: formatearPct(pIA, 0) },
    { id: 'humano_orig', titulo: 'Humano', sub: '(libro)' },
    { id: 'copilot', titulo: 'Copilot', sub: formatearPct(pCopIA, 0) },
    { id: 'deepseek', titulo: 'DeepSeek', sub: formatearPct(pDeepIA, 0) },
    { id: 'chatgpt', titulo: 'ChatGPT', sub: formatearPct(pGptIA, 0) },
    { id: 'palabra', titulo: `"${palabra}"`, sub: 'Palabra' },
  ]

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white px-2 py-4 shadow-sm">
      <p className="mb-0.5 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
        Árbol de decisión
      </p>
      <p className="mb-2 px-2 text-[9px] leading-snug text-gray-500">
        Cada nodo representa una decisión hasta obtener{' '}
        <strong className="text-[#D66B38]">{palabra || 'la palabra'}</strong>. Elige la fuente en el
        combobox (Humano o una IA) para resaltar esa rama.
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto w-full min-w-[680px]" role="img" aria-label="Árbol de Bayes">
        {aristas.map((e) => dibujarArista(e, false))}
        {nodos.map((n) => nodoBox(n.id, n.titulo, n.sub))}
        {aristas.map((e) => dibujarArista(e, true))}
      </svg>
      <ValidacionRamasSuman1
        titulo="Cada rama del árbol suma 100 %"
        nota="En cada nodo, las probabilidades de sus hijos deben agotar el 100 % (regla del árbol)."
        ramas={validacionArbol.ramas}
        todasOk={validacionArbol.todasOk}
      />
    </div>
  )
}

function Ejercicio3Markov({ resultado }) {
  return <MarkovEjercicio resultado={resultado} />
}


function TablaContingenciaCompacta({ tabla, palabraActiva }) {
  const columnas = tabla?.columnas ?? []
  const colsDatos = columnas.filter((c) => c !== 'total')
  const filas = tabla?.filas ?? []
  const totales = tabla?.totales

  const filaSeleccionada = useMemo(
    () => filas.find((f) => f.palabra === palabraActiva) ?? null,
    [filas, palabraActiva],
  )

  return (
    <div className="rounded-2xl border border-neutral-100">
      <p className="border-b border-neutral-100 bg-neutral-50/80 px-3 py-2 text-[10px] text-gray-500">
        Tabla de referencia: fila de{' '}
        <strong className="text-[#D66B38]">{palabraActiva || '—'}</strong>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left text-xs">
          <thead className="bg-neutral-50">
            <tr>
              <th className="border-b px-3 py-2 font-bold text-gray-900">Palabra</th>
              {colsDatos.map((col) => (
                <th key={col} className="border-b px-3 py-2 font-bold text-gray-900">
                  {ETIQUETAS[col] ?? col}
                </th>
              ))}
              <th className="border-b px-3 py-2 font-bold text-[#E97F4A]">Total</th>
            </tr>
          </thead>
          <tbody>
            {filaSeleccionada ? (
              <tr className="bg-[#FFF6F0]">
                <td className="border-b border-neutral-100 px-3 py-2 font-medium text-gray-900">
                  {filaSeleccionada.palabra}
                </td>
                {colsDatos.map((col) => (
                  <td
                    key={col}
                    className="border-b border-neutral-100 px-3 py-2 tabular-nums text-gray-700"
                  >
                    {filaSeleccionada[col] ?? 0}
                  </td>
                ))}
                <td className="border-b border-neutral-100 px-3 py-2 font-semibold tabular-nums text-[#E97F4A]">
                  {filaSeleccionada.total ?? 0}
                </td>
              </tr>
            ) : (
              <tr>
                <td
                  colSpan={colsDatos.length + 2}
                  className="border-b px-3 py-3 text-center text-gray-500"
                >
                  Seleccione una palabra en el desplegable superior.
                </td>
              </tr>
            )}
          </tbody>
          {totales && (
            <tfoot>
              <tr className="bg-white font-bold">
                <td className="border-t border-neutral-100 px-3 py-2.5 text-gray-900">Total</td>
                {colsDatos.map((col) => (
                  <td
                    key={col}
                    className="border-t border-neutral-100 px-3 py-2.5 tabular-nums text-gray-800"
                  >
                    {totales[col] ?? 0}
                  </td>
                ))}
                <td className="border-t border-neutral-100 px-3 py-2.5 tabular-nums text-[#E97F4A]">
                  {totales.total ?? 0}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

function texPalabra(p) {
  return `\\text{${String(p).replace(/_/g, '\\_')}}`
}

function texEtiqueta(e) {
  return `\\text{${e}}`
}

export default function ContenidoProbabilidad({ resultado }) {
  const [ejercicio, setEjercicio] = useState('1')

  const tabs = [
    { id: '1', label: 'Prob. simple' },
    { id: '2', label: 'Bayes' },
    { id: '3', label: 'Markov' },
  ]

  return (
    <div className="space-y-4">
      <div
        className="flex shrink-0 gap-1 rounded-xl bg-neutral-100/95 p-1 ring-1 ring-neutral-100"
        role="tablist"
        aria-label="Ejercicios de probabilidad"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={ejercicio === t.id}
            onClick={() => setEjercicio(t.id)}
            className={`flex-1 rounded-lg py-2.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all sm:text-[11px] ${
              ejercicio === t.id
                ? 'bg-white text-[#E97F4A] shadow-sm ring-1 ring-neutral-100'
                : 'text-gray-500 hover:text-[#E97F4A]/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {ejercicio === '1' && <Ejercicio1ProbabilidadSimple resultado={resultado} />}
      {ejercicio === '2' && <Ejercicio2Bayes resultado={resultado} />}
      {ejercicio === '3' && <Ejercicio3Markov resultado={resultado} />}
    </div>
  )
}
