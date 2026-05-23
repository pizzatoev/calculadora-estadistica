import {
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  BarChart3,
  Calculator,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  LayoutGrid,
  Loader2,
  Percent,
  Shapes,
  Target,
  Trash2,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDropzone } from 'react-dropzone'
import { BlockMath, InlineMath } from 'react-katex'
import * as XLSX from 'xlsx'
import './App.css'
import AnalisisCorpus from './AnalisisCorpus.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

const MODULOS_APP = [
  { id: 'calculadora', label: 'Calculadora Científica' },
  { id: 'corpus', label: 'Frecuencias de Corpus' },
]

const METODOS_MUESTREO = [
  { value: 'simple', label: 'Muestreo simple' },
  { value: 'sistematico', label: 'Sistemático' },
  { value: 'estratos', label: 'Estratificado' },
  { value: 'conglomerados', label: 'Por conglomerados' },
]

function SelectorCombo({ id, value, onChange, opciones = [], placeholder = '— Selecciona —' }) {
  const [abierto, setAbierto] = useState(false)
  const [menuPos, setMenuPos] = useState({
    left: 0,
    width: 0,
    top: undefined,
    bottom: undefined,
    flip: false,
  })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const actualizarPosicion = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const espacioDebajo = window.innerHeight - r.bottom
    const alturaEstimada = 200
    const flip = espacioDebajo < alturaEstimada && r.top > alturaEstimada
    const w = Math.max(r.width, 200)
    const pad = 8
    let left = r.left
    if (left + w > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - w - pad)
    }
    if (flip) {
      setMenuPos({
        left,
        width: w,
        top: undefined,
        bottom: window.innerHeight - r.top + 6,
        flip: true,
      })
    } else {
      setMenuPos({
        left,
        width: w,
        top: r.bottom + 6,
        bottom: undefined,
        flip: false,
      })
    }
  }, [])

  useLayoutEffect(() => {
    if (!abierto) return
    actualizarPosicion()
    window.addEventListener('resize', actualizarPosicion)
    window.addEventListener('scroll', actualizarPosicion, true)
    return () => {
      window.removeEventListener('resize', actualizarPosicion)
      window.removeEventListener('scroll', actualizarPosicion, true)
    }
  }, [abierto, actualizarPosicion])

  useEffect(() => {
    if (!abierto) return
    function cerrarSiFuera(e) {
      const t = triggerRef.current
      const m = menuRef.current
      if (t?.contains(e.target) || m?.contains(e.target)) return
      setAbierto(false)
    }
    document.addEventListener('mousedown', cerrarSiFuera)
    return () => document.removeEventListener('mousedown', cerrarSiFuera)
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    function escape(e) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [abierto])

  const etiquetaActual = opciones.find((op) => op.value === value)?.label ?? placeholder

  const menu = abierto && (
    <ul
      ref={menuRef}
      id={`${id}-lista`}
      role="listbox"
      className="fixed z-[100] max-h-[min(16rem,calc(100vh-2rem))] overflow-auto rounded-xl border border-neutral-100/90 bg-white py-1 shadow-xl shadow-neutral-900/15 ring-1 ring-neutral-900/5"
      style={{
        left: menuPos.left,
        width: menuPos.width,
        ...(menuPos.flip ? { bottom: menuPos.bottom } : { top: menuPos.top }),
      }}
    >
      <li role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={!value}
          className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition ${
            !value
              ? 'bg-[#FFF6F0] font-semibold text-[#D66B38]'
              : 'text-gray-600 hover:bg-[#E97F4A]/12 hover:text-[#C55A28]'
          }`}
          onClick={() => {
            onChange('')
            setAbierto(false)
          }}
        >
          <span className="truncate">{placeholder}</span>
          {!value ? (
            <Check className="h-4 w-4 shrink-0 text-[#E97F4A]" strokeWidth={2.5} aria-hidden />
          ) : null}
        </button>
      </li>
      {opciones.map((op) => {
        const seleccionado = op.value === value
        return (
          <li key={op.value} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={seleccionado}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition ${
                seleccionado
                  ? 'bg-[#FFF6F0] font-semibold text-[#D66B38]'
                  : 'text-gray-600 hover:bg-[#E97F4A]/12 hover:text-[#C55A28]'
              }`}
              onClick={() => {
                onChange(op.value)
                setAbierto(false)
              }}
            >
              <span className="truncate">{op.label}</span>
              {seleccionado ? (
                <Check className="h-4 w-4 shrink-0 text-[#E97F4A]" strokeWidth={2.5} aria-hidden />
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-controls={`${id}-lista`}
          onClick={() => setAbierto((o) => !o)}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-left text-sm font-medium text-gray-900 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/40 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        >
          <span className="min-w-0 truncate">{etiquetaActual}</span>
          <ChevronDown
            strokeWidth={2}
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
              abierto ? 'rotate-180 text-brand-500' : ''
            }`}
            aria-hidden
          />
        </button>
      </div>
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </>
  )
}

function SelectorMetodoMuestreo({ id, value, onChange }) {
  return (
    <SelectorCombo
      id={id}
      value={value}
      onChange={onChange}
      opciones={METODOS_MUESTREO}
      placeholder="— Selecciona método —"
    />
  )
}

function SelectorColumnaExcel({ id, value, onChange, opciones = [] }) {
  const opcionesFormateadas = opciones.map((op) => ({ value: op, label: op }))
  return (
    <SelectorCombo
      id={id}
      value={value}
      onChange={onChange}
      opciones={opcionesFormateadas}
      placeholder="— Selecciona una columna —"
    />
  )
}


const GRUPOS_METRICAS = [
  {
    titulo: 'Tendencia central',
    icon: Target,
    items: [
      { key: 'media', label: 'Media' },
      { key: 'mediana', label: 'Mediana' },
      { key: 'moda', label: 'Moda' },
    ],
  },
  {
    titulo: 'Dispersión',
    icon: BarChart3,
    items: [
      { key: 'rango', label: 'Rango' },
      { key: 'varianza', label: 'Varianza' },
      { key: 'desviacion', label: 'Desviación estándar' },
      { key: 'cv', label: 'Coef. de variación (%)' },
    ],
  },
  {
    titulo: 'Medidas especiales',
    icon: Calculator,
    items: [
      { key: 'media_geometrica', label: 'Media geométrica' },
      { key: 'media_armonica', label: 'Media armónica' },
      { key: 'medias_moviles', label: 'Medias móviles' },
    ],
  },
  {
    titulo: 'Medidas de posición',
    icon: Percent,
    items: [
      { key: 'cuartiles', label: 'Cuartiles' },
      { key: 'deciles', label: 'Deciles' },
      { key: 'percentiles', label: 'Percentiles' },
    ],
  },
  {
    titulo: 'Medidas de forma',
    icon: Shapes,
    items: [
      { key: 'asimetria', label: 'Asimetría' },
      { key: 'curtosis', label: 'Curtosis' },
    ],
  },
  {
    titulo: 'Tablas y gráficos',
    icon: LayoutGrid,
    items: [{ key: 'frecuencias', label: 'Distribución de Frecuencias' }],
  },
]

function parsearNumerosTexto(texto) {
  return texto
    .split(/[\s;]+/)
    .filter((token) => token.trim() !== '')
    .map((token) => parseFloat(token.replace(',', '.')))
    .filter((n) => !Number.isNaN(n) && Number.isFinite(n))
}

function parsearNumeroFlexible(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null
  }
  if (typeof valor !== 'string') return null
  const limpio = valor.trim()
  if (!limpio) return null
  const normalizado = limpio.replace(',', '.')
  const numero = parseFloat(normalizado)
  return Number.isFinite(numero) ? numero : null
}

function latexLiteral(v) {
  if (v === null || v === undefined) return '\\text{—}'
  if (typeof v === 'number' && !Number.isFinite(v)) return '\\text{—}'
  if (typeof v === 'number') {
    const t = Number.isInteger(v) ? String(v) : v.toFixed(5)
    return t.replace(/e/g, '\\mathrm{e}')
  }
  return String(v).replace(/\\/g, '\\textbackslash{}').replace(/%/g, '\\%')
}

/** Valor grande en cabecera de tarjeta: hasta 5 decimales si no es entero. */
function formatearValorPrincipalTarjeta(valor) {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return Number.isInteger(valor) ? String(valor) : valor.toFixed(5)
  }
  return String(valor)
}

function sinCampoValor(obj) {
  if (!obj || typeof obj !== 'object') return undefined
  const { valor: _v, ...rest } = obj
  return rest
}

function formulaRangoLaTeX(r) {
  if (!r) return null
  return `R = x_{\\max} - x_{\\min} = ${latexLiteral(r.maximo)} - ${latexLiteral(r.minimo)} = ${latexLiteral(r.valor)}`
}

function formulaDesviacionLaTeX(d, vr) {
  if (!d || vr == null) return null
  return `s = \\sqrt{s^2} = \\sqrt{${latexLiteral(vr.valor)}} = ${latexLiteral(d.valor)}`
}

function formulaCvLaTeX(cv) {
  if (!cv) return null
  return `\\mathrm{CV} = \\frac{s}{|\\mu|} \\times 100 = \\frac{${latexLiteral(cv.desviacion_estandar)}}{${latexLiteral(cv.media)}} \\times 100 = ${latexLiteral(cv.valor)}\\%`
}

/** Definición cuando no hay cálculo numérico (valores ≤ 0). */
function formulaMediaGeometricaDefinicionLaTeX() {
  return `G = \\sqrt[n]{x_1 x_2 \\cdots x_n} = \\exp\\left(\\frac{1}{n}\\sum_{i=1}^{n} \\ln x_i\\right)`
}

function formulaMediaArmonicaDefinicionLaTeX() {
  return `H = \\frac{n}{\\displaystyle\\sum_{i=1}^{n} \\frac{1}{x_i}}`
}

const ORDEN_METRICAS = [
  'media',
  'mediana',
  'moda',
  'rango',
  'varianza',
  'desviacion',
  'cv',
  'media_geometrica',
  'media_armonica',
  'medias_moviles',
  'cuartiles',
  'deciles',
  'percentiles',
  'asimetria',
  'curtosis',
  'frecuencias',
]

const PALETA_GRAFICOS = [
  '#E97F4A',
  '#F2A87A',
  '#14B8A6',
  '#0D9488',
  '#FBBF24',
  '#EA580C',
  '#5EEAD4',
  '#FB923C',
  '#2DD4BF',
  '#F97316',
]

/** Orden numérico de tallos (incluye negativos). */
function ordenarTallos(keys) {
  return [...keys].sort((a, b) => {
    const na = Number(a)
    const nb = Number(b)
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
    return String(a).localeCompare(String(b), undefined, { numeric: true })
  })
}

function TarjetaDistribucionFrecuencias({
  distribucion,
  tituloGrupoDatos = '',
  className = '',
  sinMarcoExterno = false,
  carruselNavegacion = null,
  carruselPaginacion = null,
}) {
  const [activeSubTab, setActiveSubTab] = useState('frecuencia')
  const [chartType, setChartType] = useState('histograma')

  const tabla = distribucion?.tabla
  const talloHoja = distribucion?.tallo_hoja
  const parametros = distribucion?.parametros

  useEffect(() => {
    setActiveSubTab('frecuencia')
    setChartType('histograma')
  }, [distribucion])

  const chartData = useMemo(() => {
    if (!Array.isArray(tabla)) return []
    const formatNum5 = (num) => {
      const n = Number(num)
      if (!Number.isFinite(n)) return String(num ?? '')
      return Number.isInteger(n) ? String(n) : n.toFixed(5)
    }
    return [...tabla].map((row) => ({
      ...row,
      f: Number(row.f ?? row.fi ?? 0),
      intervalo:
        Number.isFinite(Number(row.limite_inf)) && Number.isFinite(Number(row.limite_sup))
          ? `[${formatNum5(row.limite_inf)} - ${formatNum5(row.limite_sup)})`
          : String(row.intervalo ?? ''),
    }))
  }, [tabla])

  const pieData = useMemo(() => {
    if (!Array.isArray(chartData)) return []
    if (chartData.length <= 6) return chartData

    const ordenados = [...chartData].sort((a, b) => Number(b.f) - Number(a.f))
    const top5 = ordenados.slice(0, 5)
    const resto = ordenados.slice(5)
    const sumaRestante = resto.reduce((acc, item) => acc + Number(item.f ?? 0), 0)

    return [
      ...top5,
      {
        intervalo: 'Otros',
        f: sumaRestante,
      },
    ]
  }, [chartData])

  const tallosOrdenados = useMemo(() => {
    if (!talloHoja || typeof talloHoja !== 'object') return []
    return ordenarTallos(Object.keys(talloHoja))
  }, [talloHoja])

  const clasesContenedor = sinMarcoExterno
    ? `flex min-h-0 min-w-0 flex-1 flex-col bg-transparent ${className}`
    : `flex min-h-0 min-w-0 flex-1 flex-col rounded-[1.5rem] border border-neutral-100/90 bg-neutral-50/40 p-4 shadow-sm shadow-neutral-900/[0.06] sm:p-5 ${className}`

  const cabeceraTitulo = (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/95">
      Distribución de frecuencias
    </p>
  )

  function renderCabeceraNaranja() {
    if (carruselNavegacion) {
      return (
        <div className="flex shrink-0 items-center bg-[#E97F4A] py-5 sm:py-6">
          <button
            type="button"
            aria-label="Métrica anterior"
            onClick={carruselNavegacion.onAnterior}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-200 ease-out hover:scale-[1.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11 sm:w-11"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />
          </button>
          <div className="min-w-0 flex-1 px-2 text-center sm:px-3">{cabeceraTitulo}</div>
          <button
            type="button"
            aria-label="Siguiente métrica"
            onClick={carruselNavegacion.onSiguiente}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-200 ease-out hover:scale-[1.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11 sm:w-11"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      )
    }
    return (
      <div className="shrink-0 bg-[#E97F4A] px-6 py-5 text-center sm:px-8 sm:py-6">{cabeceraTitulo}</div>
    )
  }

  const sinDatos = !Array.isArray(tabla) || tabla.length === 0
  const pRango = parsearNumeroFlexible(parametros?.rango)
  const pN = parsearNumeroFlexible(parametros?.n)
  const pKExacto = parsearNumeroFlexible(parametros?.k_exacto)
  const pKRedondeado = parsearNumeroFlexible(parametros?.k_redondeado)
  const pAmplitudExacta = parsearNumeroFlexible(parametros?.amplitud_exacta)
  const pAmplitudAplicada =
    parsearNumeroFlexible(parametros?.amplitud_aplicada) ??
    parsearNumeroFlexible(parametros?.amplitud_redondeada)
  const mostrarTituloGrafico = typeof tituloGrupoDatos === 'string' && tituloGrupoDatos.trim() !== ''
  const nombreGraficoFrecuencia =
    chartType === 'histograma'
      ? 'Histograma'
      : chartType === 'poligono'
        ? 'Polígono'
        : chartType === 'barras'
          ? 'Barras'
          : chartType === 'circular'
            ? 'Circular'
            : 'Tallo y Hoja'
  const formatNum = (num) => (Number.isInteger(num) ? num : Number(num).toFixed(2))
  const paso3AmplitudMath =
    pAmplitudExacta === null || pAmplitudAplicada === null
      ? ''
      : `A = \\frac{R}{k} = \\frac{${latexLiteral(pRango?.toFixed(4))}}{${latexLiteral(
          pKRedondeado,
        )}} = ${latexLiteral(pAmplitudExacta.toFixed(4))} \\approx ${latexLiteral(
          pAmplitudAplicada.toFixed(4),
        )}`
  const hayParametrosFrecuencia =
    pRango !== null &&
    pN !== null &&
    pKExacto !== null &&
    pKRedondeado !== null &&
    pAmplitudExacta !== null &&
    pAmplitudAplicada !== null

  return (
    <div className={clasesContenedor.trim()}>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-neutral-200/90 bg-white shadow-sm shadow-neutral-900/10">
        {renderCabeceraNaranja()}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 border-t border-white/20 bg-white px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div
            className="flex shrink-0 gap-1 rounded-xl bg-neutral-100/95 p-1 ring-1 ring-neutral-100"
            role="tablist"
            aria-label="Vista de distribución"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'frecuencia'}
              onClick={() => setActiveSubTab('frecuencia')}
              className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold uppercase tracking-wider transition-all sm:text-[11px] ${
                activeSubTab === 'frecuencia'
                  ? 'bg-white text-[#E97F4A] shadow-sm ring-1 ring-neutral-100'
                  : 'text-gray-500 hover:text-[#E97F4A]/80'
              }`}
            >
              Frecuencia
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'graficos'}
              onClick={() => setActiveSubTab('graficos')}
              className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold uppercase tracking-wider transition-all sm:text-[11px] ${
                activeSubTab === 'graficos'
                  ? 'bg-white text-[#E97F4A] shadow-sm ring-1 ring-neutral-100'
                  : 'text-gray-500 hover:text-[#E97F4A]/80'
              }`}
            >
              Gráficos
            </button>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
            {sinDatos ? (
              <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-8 text-center text-sm text-gray-500">
                No hay tabla de frecuencias. Vuelve a procesar los datos con el backend actualizado.
              </p>
            ) : activeSubTab === 'frecuencia' ? (
              <div>
                {hayParametrosFrecuencia ? (
                  <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/60 px-4 py-4 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-gray-800">Parámetros de la Tabla</p>
                    <div className="space-y-3 [&_.katex]:text-[1.35rem]">
                      <BlockMath math={`R = X_{max} - X_{min} = ${latexLiteral(pRango)}`} />
                      <BlockMath
                        math={`k = 1 + 3.322 \\log_{10}(${latexLiteral(pN)}) = ${latexLiteral(
                          pKExacto?.toFixed(4),
                        )} \\approx ${latexLiteral(pKRedondeado)}`}
                      />
                      <BlockMath math={paso3AmplitudMath} />
                      <p className="text-xs text-neutral-500">
                        * Se utiliza una amplitud ajustada para garantizar que los intervalos
                        cubran el rango exacto de los datos sin generar clases vacías
                        (desbordes).
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200/80 shadow-sm">
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-[#FFE8DC] text-[#B85A2A]">
                        <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold tracking-wide">
                          Intervalo
                        </th>
                        <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold tracking-wide">
                          f
                        </th>
                        <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold tracking-wide">
                          F
                        </th>
                        <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold tracking-wide">
                          h
                        </th>
                        <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold tracking-wide">
                          H
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabla.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50/40 transition-colors hover:bg-[#FFF8F3]"
                        >
                          <td className="px-3 py-2 font-mono text-xs text-gray-800">
                            {Number.isFinite(Number(row.limite_inf)) &&
                            Number.isFinite(Number(row.limite_sup))
                              ? `[${formatNum(Number(row.limite_inf))} - ${formatNum(
                                  Number(row.limite_sup),
                                )})`
                              : row.intervalo}
                          </td>
                          <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{row.f ?? row.fi}</td>
                          <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{row.F ?? row.Fi}</td>
                          <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{row.h ?? row.hi}</td>
                          <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{row.H ?? row.Hi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col gap-3">
                <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-neutral-100/95 p-1 ring-1 ring-neutral-100 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    { id: 'histograma', label: 'Histograma' },
                    { id: 'poligono', label: 'Polígono' },
                    { id: 'barras', label: 'Barras' },
                    { id: 'circular', label: 'Circular' },
                    { id: 'tallo', label: 'Tallo y Hoja' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setChartType(id)}
                      className={`w-full rounded-lg px-3 py-2 text-center text-xs font-bold uppercase tracking-wider transition-all sm:text-[11px] ${
                        chartType === id
                          ? 'bg-[#E97F4A] text-white shadow-md shadow-[#E97F4A]/25'
                          : 'bg-white text-gray-500 ring-1 ring-neutral-100 hover:text-[#E97F4A] hover:ring-[#E97F4A]/25'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {mostrarTituloGrafico ? (
                  <p className="shrink-0 text-center text-sm font-semibold text-gray-700">
                    Gráfico: {nombreGraficoFrecuencia} de {tituloGrupoDatos}
                  </p>
                ) : null}

                <div className="min-h-0 flex-1 rounded-xl border border-neutral-100 bg-neutral-50/30 p-2 sm:p-3">
                  {chartType === 'tallo' ? (
                    tallosOrdenados.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-500">Sin datos de tallo y hoja.</p>
                    ) : (
                      <div className="mx-auto max-w-md space-y-0 font-mono text-sm">
                        {tallosOrdenados.map((tallo) => (
                          <div
                            key={tallo}
                            className="grid grid-cols-[3.5rem_1fr] gap-0 border-b border-neutral-100 py-2.5 last:border-b-0 sm:grid-cols-[4rem_1fr]"
                          >
                            <div className="border-r border-neutral-200 pr-3 text-right text-base font-bold text-[#E97F4A]">
                              {tallo}
                            </div>
                            <div className="pl-3 text-gray-800">
                              {(talloHoja[tallo] ?? []).join('\u00A0\u00A0')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : chartType === 'circular' ? (
                    <div className="h-[300px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="f"
                            nameKey="intervalo"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, percent }) =>
                              `${String(name).slice(0, 12)}${String(name).length > 12 ? '…' : ''} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PALETA_GRAFICOS[i % PALETA_GRAFICOS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid #eee',
                              fontSize: 12,
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : chartType === 'poligono' ? (
                    <div className="h-[300px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                          <XAxis
                            dataKey="intervalo"
                            tick={{ fontSize: 9, fill: '#64748b' }}
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                            height={58}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid #eee' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="fi"
                            stroke="#E97F4A"
                            strokeWidth={2.5}
                            dot={{ fill: '#E97F4A', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                          barCategoryGap={chartType === 'histograma' ? 0 : 18}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" vertical={false} />
                          <XAxis
                            dataKey="intervalo"
                            tick={{ fontSize: 9, fill: '#64748b' }}
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                            height={58}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid #eee' }}
                          />
                          <Bar
                            dataKey="fi"
                            fill="#E97F4A"
                            radius={chartType === 'histograma' ? [2, 2, 0, 0] : [6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {carruselPaginacion && carruselPaginacion.total > 0 ? (
          <div
            className="shrink-0 border-t border-neutral-200/80 bg-white px-4 py-2.5 text-center text-xs tabular-nums text-gray-400 sm:px-6"
            aria-live="polite"
          >
            {carruselPaginacion.actual} / {carruselPaginacion.total}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TarjetaMediasMoviles({
  filas,
  tituloGrupoDatos = '',
  className = '',
  sinMarcoExterno = false,
  carruselNavegacion = null,
  carruselPaginacion = null,
}) {
  const [activeMovilTab, setActiveMovilTab] = useState('procedimiento')
  const [chartMovilTipo, setChartMovilTipo] = useState('mm3')

  useEffect(() => {
    setActiveMovilTab('procedimiento')
    setChartMovilTipo('mm3')
  }, [filas])

  const chartData = useMemo(() => {
    if (!Array.isArray(filas)) return []
    return filas.map((r, idx) => ({
      n: idx + 1,
      dato: r.dato,
      mm3: r.mm3,
      mm4_1: r.mm4_1,
      mm4_2: r.mm4_2,
    }))
  }, [filas])

  const clasesContenedor = sinMarcoExterno
    ? `flex min-h-0 min-w-0 flex-1 flex-col bg-transparent ${className}`
    : `flex min-h-0 min-w-0 flex-1 flex-col rounded-[1.5rem] border border-neutral-100/90 bg-neutral-50/40 p-4 shadow-sm shadow-neutral-900/[0.06] sm:p-5 ${className}`

  const cabeceraTitulo = (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/95">
      Medias móviles
    </p>
  )

  function renderCabeceraNaranja() {
    if (carruselNavegacion) {
      return (
        <div className="flex shrink-0 items-center bg-[#E97F4A] py-5 sm:py-6">
          <button
            type="button"
            aria-label="Métrica anterior"
            onClick={carruselNavegacion.onAnterior}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-200 ease-out hover:scale-[1.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11 sm:w-11"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />
          </button>
          <div className="min-w-0 flex-1 px-2 text-center sm:px-3">{cabeceraTitulo}</div>
          <button
            type="button"
            aria-label="Siguiente métrica"
            onClick={carruselNavegacion.onSiguiente}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-200 ease-out hover:scale-[1.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11 sm:w-11"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      )
    }
    return (
      <div className="shrink-0 bg-[#E97F4A] px-6 py-5 text-center sm:px-8 sm:py-6">{cabeceraTitulo}</div>
    )
  }

  function celda(v) {
    if (v === null || v === undefined) return '—'
    return String(v)
  }
  const mostrarTituloGrafico = typeof tituloGrupoDatos === 'string' && tituloGrupoDatos.trim() !== ''
  const nombreGraficoMovil = chartMovilTipo === 'mm3' ? 'MM3' : 'MM4'

  const lista = Array.isArray(filas) ? filas : []

  return (
    <div className={clasesContenedor.trim()}>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-neutral-200/90 bg-white shadow-sm shadow-neutral-900/10">
        {renderCabeceraNaranja()}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 border-t border-white/20 bg-white px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div
            className="flex shrink-0 gap-1 rounded-xl bg-neutral-100/95 p-1 ring-1 ring-neutral-100"
            role="tablist"
            aria-label="Vista medias móviles"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeMovilTab === 'procedimiento'}
              onClick={() => setActiveMovilTab('procedimiento')}
              className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold uppercase tracking-wider transition-all sm:text-[11px] ${
                activeMovilTab === 'procedimiento'
                  ? 'bg-white text-[#E97F4A] shadow-sm ring-1 ring-neutral-100'
                  : 'text-gray-500 hover:text-[#E97F4A]/80'
              }`}
            >
              Procedimiento
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMovilTab === 'graficos'}
              onClick={() => setActiveMovilTab('graficos')}
              className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold uppercase tracking-wider transition-all sm:text-[11px] ${
                activeMovilTab === 'graficos'
                  ? 'bg-white text-[#E97F4A] shadow-sm ring-1 ring-neutral-100'
                  : 'text-gray-500 hover:text-[#E97F4A]/80'
              }`}
            >
              Gráficos
            </button>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
            {activeMovilTab === 'procedimiento' ? (
              lista.length === 0 ? (
                <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-8 text-center text-sm text-gray-500">
                  No hay datos de medias móviles. Vuelve a procesar con el backend actualizado.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-200/80 shadow-sm">
                  <table className="w-full min-w-[360px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-[#FFE8DC] text-[#B85A2A]">
                        <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">Dato</th>
                        <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">MM3</th>
                        <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">MM4,1</th>
                        <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">MM4,2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((row, idx) => (
                        <tr
                          key={`mm-fila-${idx}`}
                          className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50/40 hover:bg-[#FFF8F3]"
                        >
                          <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{celda(row.dato)}</td>
                          <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{celda(row.mm3)}</td>
                          <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{celda(row.mm4_1)}</td>
                          <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{celda(row.mm4_2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="flex min-h-[320px] flex-col gap-3">
                <div className="grid shrink-0 grid-cols-1 gap-1 rounded-xl bg-neutral-100/95 p-1 ring-1 ring-neutral-100 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setChartMovilTipo('mm3')}
                    className={`w-full rounded-lg px-3 py-2 text-center text-xs font-bold uppercase tracking-wider transition-all sm:text-[11px] ${
                      chartMovilTipo === 'mm3'
                        ? 'bg-[#E97F4A] text-white shadow-md shadow-[#E97F4A]/25'
                        : 'bg-white text-gray-500 ring-1 ring-neutral-100 hover:text-[#E97F4A] hover:ring-[#E97F4A]/25'
                    }`}
                  >
                    Gráfico MM3
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMovilTipo('mm4')}
                    className={`w-full rounded-lg px-3 py-2 text-center text-xs font-bold uppercase tracking-wider transition-all sm:text-[11px] ${
                      chartMovilTipo === 'mm4'
                        ? 'bg-[#E97F4A] text-white shadow-md shadow-[#E97F4A]/25'
                        : 'bg-white text-gray-500 ring-1 ring-neutral-100 hover:text-[#E97F4A] hover:ring-[#E97F4A]/25'
                    }`}
                  >
                    Gráfico MM4
                  </button>
                </div>
                {mostrarTituloGrafico ? (
                  <p className="shrink-0 text-center text-sm font-semibold text-gray-700">
                    Gráfico: {nombreGraficoMovil} de {tituloGrupoDatos}
                  </p>
                ) : null}
                <div className="min-h-0 flex-1 rounded-xl border border-neutral-100 bg-neutral-50/30 p-2 sm:p-3">
                  {lista.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">Sin datos para graficar.</p>
                  ) : (
                    <div className="h-[300px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                          <XAxis
                            dataKey="n"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            allowDecimals={false}
                            label={{ value: 'n', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid #eee',
                              fontSize: 12,
                            }}
                            labelFormatter={(v) => `n = ${v}`}
                          />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                          {chartMovilTipo === 'mm3' ? (
                            <>
                              <Line
                                type="monotone"
                                dataKey="dato"
                                name="Dato"
                                stroke="#93C5FD"
                                strokeWidth={1}
                                dot={false}
                                connectNulls={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="mm3"
                                name="MM3"
                                stroke="#EA580C"
                                strokeWidth={3}
                                dot={false}
                                connectNulls={false}
                              />
                            </>
                          ) : (
                            <>
                              <Line
                                type="monotone"
                                dataKey="dato"
                                name="Dato"
                                stroke="#93C5FD"
                                strokeWidth={1}
                                dot={false}
                                connectNulls={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="mm3"
                                name="MM3"
                                stroke="#EA580C"
                                strokeWidth={3}
                                dot={false}
                                connectNulls={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="mm4_1"
                                name="MM4,1"
                                stroke="#F59E0B"
                                strokeWidth={2.75}
                                dot={false}
                                connectNulls={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="mm4_2"
                                name="MM4,2"
                                stroke="#14B8A6"
                                strokeWidth={3.25}
                                dot={false}
                                connectNulls={false}
                              />
                            </>
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {carruselPaginacion && carruselPaginacion.total > 0 ? (
          <div
            className="shrink-0 border-t border-neutral-200/80 bg-white px-4 py-2.5 text-center text-xs tabular-nums text-gray-400 sm:px-6"
            aria-live="polite"
          >
            {carruselPaginacion.actual} / {carruselPaginacion.total}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TarjetaShellMedidasPosicion({
  titulo,
  children,
  className = '',
  sinMarcoExterno = false,
  carruselNavegacion = null,
  carruselPaginacion = null,
}) {
  const clasesContenedor = sinMarcoExterno
    ? `flex min-h-0 min-w-0 flex-1 flex-col bg-transparent ${className}`
    : `flex min-h-0 min-w-0 flex-1 flex-col rounded-[1.5rem] border border-neutral-100/90 bg-neutral-50/40 p-4 shadow-sm shadow-neutral-900/[0.06] sm:p-5 ${className}`

  const cabeceraTitulo = (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/95">{titulo}</p>
  )

  function renderCabeceraNaranja() {
    if (carruselNavegacion) {
      return (
        <div className="flex shrink-0 items-center bg-[#E97F4A] py-5 sm:py-6">
          <button
            type="button"
            aria-label="Métrica anterior"
            onClick={carruselNavegacion.onAnterior}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-200 ease-out hover:scale-[1.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11 sm:w-11"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />
          </button>
          <div className="min-w-0 flex-1 px-2 text-center sm:px-3">{cabeceraTitulo}</div>
          <button
            type="button"
            aria-label="Siguiente métrica"
            onClick={carruselNavegacion.onSiguiente}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-200 ease-out hover:scale-[1.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11 sm:w-11"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      )
    }
    return (
      <div className="shrink-0 bg-[#E97F4A] px-6 py-5 text-center sm:px-8 sm:py-6">{cabeceraTitulo}</div>
    )
  }

  return (
    <div className={clasesContenedor.trim()}>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-neutral-200/90 bg-white shadow-sm shadow-neutral-900/10">
        {renderCabeceraNaranja()}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto border-t border-white/20 bg-white px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          {children}
        </div>
        {carruselPaginacion && carruselPaginacion.total > 0 ? (
          <div
            className="shrink-0 border-t border-neutral-200/80 bg-white px-4 py-2.5 text-center text-xs tabular-nums text-gray-400 sm:px-6"
            aria-live="polite"
          >
            {carruselPaginacion.actual} / {carruselPaginacion.total}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function fmtCeldaPosicion(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—'
  const x = Number(v)
  return Number.isInteger(x) ? String(x) : String(Math.round(x * 1e6) / 1e6)
}

function TarjetaCuartilesPosicion({ mp, ...shellProps }) {
  const n = Number(mp?.n)
  const cu = mp?.cuartiles ?? {}
  const filas = [
    { q: 'Q1', k: 1, clave: 'q1' },
    { q: 'Q2', k: 2, clave: 'q2' },
    { q: 'Q3', k: 3, clave: 'q3' },
  ]

  return (
    <TarjetaShellMedidasPosicion titulo="Cuartiles" {...shellProps}>
      <div className="min-w-0 shrink-0 text-3xl my-6 py-2 [&_.katex]:text-[1.85rem]">
        <BlockMath math={'\\text{Posición} = \\frac{k \\cdot n}{4}'} />
      </div>
      {!Number.isFinite(n) || n <= 0 ? (
        <p className="text-sm text-gray-500">Sin datos de posición. Procesa de nuevo con el backend actualizado.</p>
      ) : (
        <div className="min-h-0 overflow-x-auto rounded-xl border border-neutral-200/80 shadow-sm">
          <table className="w-full min-w-[280px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#FFE8DC] text-[#B85A2A]">
                <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">Q</th>
                <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">
                  Posición <span className="font-mono text-[11px] font-semibold opacity-90">(k·n/4)</span>
                </th>
                <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ q, k, clave }) => {
                const pos = (k * n) / 4
                const val = cu[clave]
                return (
                  <tr
                    key={clave}
                    className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50/40 hover:bg-[#FFF8F3]"
                  >
                    <td className="px-3 py-2 font-semibold text-gray-800">
                      {q} ({k * 25}%)
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{fmtCeldaPosicion(pos)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{fmtCeldaPosicion(val)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </TarjetaShellMedidasPosicion>
  )
}

function TarjetaDecilesPosicion({ mp, ...shellProps }) {
  const n = Number(mp?.n)
  const dec = mp?.deciles ?? {}

  return (
    <TarjetaShellMedidasPosicion titulo="Deciles" {...shellProps}>
      <div className="min-w-0 shrink-0 text-3xl my-6 py-2 [&_.katex]:text-[1.85rem]">
        <BlockMath math={'\\text{Posición} = \\frac{k \\cdot n}{10}'} />
      </div>
      {!Number.isFinite(n) || n <= 0 ? (
        <p className="text-sm text-gray-500">Sin datos de posición. Procesa de nuevo con el backend actualizado.</p>
      ) : (
        <div className="min-h-0 overflow-x-auto rounded-xl border border-neutral-200/80 shadow-sm">
          <table className="w-full min-w-[300px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#FFE8DC] text-[#B85A2A]">
                <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">D</th>
                <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">
                  Posición <span className="font-mono text-[11px] font-semibold opacity-90">(k·n/10)</span>
                </th>
                <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((k) => {
                const clave = `d${k}`
                const pos = (k * n) / 10
                const val = dec[clave]
                return (
                  <tr
                    key={clave}
                    className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50/40 hover:bg-[#FFF8F3]"
                  >
                    <td className="px-3 py-2 font-semibold text-gray-800">{`D${k} (${k * 10}%)`}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{fmtCeldaPosicion(pos)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-gray-800">{fmtCeldaPosicion(val)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </TarjetaShellMedidasPosicion>
  )
}

function TarjetaPercentilesPosicion({ mp, inputPercentil, setInputPercentil, ...shellProps }) {
  const n = Number(mp?.n)
  const perc = mp?.percentiles ?? {}
  const p = Math.min(99, Math.max(1, Math.round(Number(inputPercentil)) || 50))
  const pos = Number.isFinite(n) && n > 0 ? (p * n) / 100 : NaN
  const valorP = perc[String(p)]
  const actualizarPercentil = (next) => {
    const v = Math.round(Number(next))
    if (Number.isNaN(v)) return
    setInputPercentil(Math.min(99, Math.max(1, v)))
  }

  return (
    <TarjetaShellMedidasPosicion titulo="Percentiles" {...shellProps}>
      <div className="min-w-0 shrink-0 text-3xl my-6 py-2 [&_.katex]:text-[1.85rem]">
        <BlockMath math={'\\text{Posición} = \\frac{k \\cdot n}{100}'} />
      </div>
      <div className="rounded-2xl border border-[#F4D67A]/70 bg-[#FFFBEA] px-4 py-4 shadow-sm">
        <p className="text-center text-sm font-semibold text-[#9A6A00]">
          El usuario debe escoger el percentil (1 a 99)
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => actualizarPercentil(p - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F4D67A] bg-white text-lg font-bold text-[#B8860B] shadow-sm transition hover:bg-[#FFF5CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B300]/45"
            aria-label="Disminuir percentil"
          >
            −
          </button>
          <label htmlFor="input-percentil-p" className="sr-only">
            Percentil (1 a 99)
          </label>
          <input
            id="input-percentil-p"
            type="number"
            min={1}
            max={99}
            value={p}
            onChange={(e) => actualizarPercentil(e.target.value)}
            className="box-border h-11 w-full max-w-[8rem] rounded-xl border border-[#F4D67A] bg-white px-3 text-center text-lg font-extrabold tabular-nums text-[#8A6500] shadow-sm focus:border-[#E8B300] focus:outline-none focus:ring-4 focus:ring-[#E8B300]/20"
          />
          <button
            type="button"
            onClick={() => actualizarPercentil(p + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F4D67A] bg-white text-lg font-bold text-[#B8860B] shadow-sm transition hover:bg-[#FFF5CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B300]/45"
            aria-label="Aumentar percentil"
          >
            +
          </button>
        </div>
        <div className="mt-3 px-1">
          <input
            type="range"
            min={1}
            max={99}
            step={1}
            value={p}
            onChange={(e) => actualizarPercentil(e.target.value)}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#F9E8A6] accent-[#E8B300]"
            aria-label="Selector de percentil"
          />
          <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#A37A00]">
            <span>P1</span>
            <span>P50</span>
            <span>P99</span>
          </div>
        </div>
      </div>
      {!Number.isFinite(n) || n <= 0 ? (
        <p className="text-center text-sm text-gray-500">Sin datos de posición.</p>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-neutral-200/80 shadow-sm">
          <table className="w-full min-w-[320px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#FFE8DC] text-[#B85A2A]">
                <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">P</th>
                <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">
                  Posición <span className="font-mono text-[11px] font-semibold opacity-90">(k·n/100)</span>
                </th>
                <th className="border-b border-[#F2C4A8]/80 px-3 py-2.5 font-bold">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-100 bg-white hover:bg-[#FFF8F3]">
                <td className="px-3 py-2.5 font-semibold text-gray-800">
                  P{p} ({p}%)
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-gray-800">{fmtCeldaPosicion(pos)}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-gray-800">{fmtCeldaPosicion(valorP)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </TarjetaShellMedidasPosicion>
  )
}

/** Procedimiento didáctico: fórmula general → (texto) → sustitución numérica. */
function ProcedimientoMediaDidactico({ media }) {
  const desarrollo = `\\begin{aligned}
\\bar{x} &= \\frac{\\sum x_i}{n} \\\\
\\bar{x} &= \\frac{${latexLiteral(media.suma_x)}}{${latexLiteral(media.n)}} \\\\
\\bar{x} &= ${latexLiteral(media.valor)}
\\end{aligned}`
  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <p className="rounded-xl border border-amber-300/70 border-dashed bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-900/90">
        1. Se suman todos los datos del conjunto. <br />
        2. Se divide esa suma entre la cantidad total de datos ({media.n}). <br />
        3. El resultado final corresponde a la media aritmética.
      </p>
    </div>
  )
}

function ProcedimientoMedianaDidactico({ mediana }) {
  const n = Number(mediana.n)
  const esPar = Number.isFinite(n) && n % 2 === 0
  const e1 = latexLiteral(mediana.elemento_central_1)
  const e2 = latexLiteral(mediana.elemento_central_2)
  const v = latexLiteral(mediana.valor)
  const desarrollo = esPar
    ? `\\begin{aligned}
\\mathrm{Me} &= \\frac{x_{\\frac{n}{2}} + x_{\\frac{n}{2}+1}}{2} \\\\
\\mathrm{Me} &= \\frac{${e1} + ${e2}}{2} \\\\
\\mathrm{Me} &= ${v}
\\end{aligned}`
    : `\\begin{aligned}
\\mathrm{Me} &= x_{\\frac{n+1}{2}} \\\\
\\mathrm{Me} &= ${e1} \\\\
\\mathrm{Me} &= ${v}
\\end{aligned}`

  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <p className="rounded-xl border border-amber-300/70 border-dashed bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-900/90">
        1. Se ordenan los números de menor a mayor.
        <br />
        2. Como la cantidad de datos (n = {mediana.n}) es {esPar ? 'par' : 'impar'},{' '}
        {esPar
          ? 'se toman los dos números del medio y se promedian.'
          : 'se toma el número central.'}
        <br />
        3. El valor obtenido se reporta como mediana.
      </p>
    </div>
  )
}

function ProcedimientoModaDidactico({ moda }) {
  const tieneConteo =
    moda.conteo_moda != null &&
    moda.conteo_moda !== undefined &&
    Number.isFinite(Number(moda.conteo_moda))
  const v = latexLiteral(moda.valor)
  const desarrollo = tieneConteo
    ? `\\begin{aligned}
\\mathrm{Mo} &= \\text{Valor con mayor frecuencia} \\\\
\\mathrm{Mo} &= ${v} \\\\
\\mathrm{Mo} &= ${v}\\;\\text{(se repite ${String(moda.conteo_moda)} veces)}
\\end{aligned}`
    : `\\begin{aligned}
\\mathrm{Mo} &= \\text{Valor con mayor frecuencia} \\\\
\\mathrm{Mo} &= ${v} \\\\
\\mathrm{Mo} &= ${v}
\\end{aligned}`

  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <p className="rounded-xl border border-amber-300/70 border-dashed bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-900/90">
        1. Se cuentan las repeticiones de cada valor del conjunto. <br />
        2. Se identifica el valor con mayor frecuencia absoluta. <br />
        3. Ese valor se reporta como la moda.
      </p>
    </div>
  )
}

function ProcedimientoVarianzaDidactico({ vr, esMuestra }) {
  const sc = latexLiteral(vr.suma_cuadrados_dif)
  const gl = latexLiteral(vr.grados_libertad)
  const nn = latexLiteral(vr.n)
  const val = latexLiteral(vr.valor)
  if (esMuestra) {
    const desarrollo = `\\begin{aligned}
s^2 &= \\frac{\\sum (x_i - \\bar{x})^2}{n-1} \\\\
s^2 &= \\frac{${sc}}{${gl}} \\\\
s^2 &= ${val}
\\end{aligned}`
    return (
      <div className="space-y-5">
        <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
          <BlockMath math={desarrollo} />
        </div>
        <p className="rounded-xl border border-amber-300/70 border-dashed bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-900/90">
          1. Se calcula la media muestral del conjunto. <br />
          2. Se obtiene la suma de cuadrados de las diferencias respecto a esa media. <br />
          3. Se divide entre \\(n-1\\) para obtener la varianza muestral.
        </p>
      </div>
    )
  }
  const desarrollo = `\\begin{aligned}
\\sigma^2 &= \\frac{\\sum (x_i - \\mu)^2}{N} \\\\
\\sigma^2 &= \\frac{${sc}}{${nn}} \\\\
\\sigma^2 &= ${val}
\\end{aligned}`
  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <p className="rounded-xl border border-amber-300/70 border-dashed bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-900/90">
        1. Se calcula la media poblacional del conjunto. <br />
        2. Se obtiene la suma de cuadrados de las diferencias respecto a esa media. <br />
        3. Se divide entre \\(N\\) para obtener la varianza poblacional.
      </p>
    </div>
  )
}

function ProcedimientoRangoDidactico({ r }) {
  const max = latexLiteral(r.maximo)
  const min = latexLiteral(r.minimo)
  const val = latexLiteral(r.valor)
  const desarrollo = `\\begin{aligned}
R &= x_{\\max} - x_{\\min} \\\\
R &= ${max} - ${min} \\\\
R &= ${val}
\\end{aligned}`
  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <p className="rounded-xl border border-amber-300/70 border-dashed bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-900/90">
        1. Se identifica el valor máximo y el valor mínimo del conjunto. <br />
        2. Se realiza la resta: máximo menos mínimo. <br />
        3. La diferencia obtenida corresponde al rango.
      </p>
    </div>
  )
}

function ProcedimientoDesviacionDidactico({ d, vr }) {
  const varV = latexLiteral(vr?.valor)
  const desV = latexLiteral(d?.valor)
  const desarrollo = `\\begin{aligned}
s &= \\sqrt{s^2} \\\\
s &= \\sqrt{${varV}} \\\\
s &= ${desV}
\\end{aligned}`
  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <p className="rounded-xl border border-amber-300/70 border-dashed bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-900/90">
        1. Se toma la varianza previamente calculada. <br />
        2. Se aplica raíz cuadrada a dicha varianza. <br />
        3. El resultado corresponde a la desviación estándar.
      </p>
    </div>
  )
}

function ProcedimientoCvDidactico({ cv }) {
  const d = latexLiteral(cv.desviacion_estandar)
  const m = latexLiteral(cv.media)
  const v = latexLiteral(cv.valor)
  const desarrollo = `\\begin{aligned}
\\mathrm{CV} &= \\frac{s}{\\bar{x}} \\cdot 100 \\\\
\\mathrm{CV} &= \\frac{${d}}{${m}} \\cdot 100 \\\\
\\mathrm{CV} &= ${v}\\%
\\end{aligned}`
  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <p className="rounded-xl border border-amber-300/70 border-dashed bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-900/90">
        1. Se divide la desviación estándar entre la media. <br />
        2. El cociente se multiplica por 100 para expresarlo en porcentaje. <br />
        3. Ese porcentaje mide la variabilidad relativa del conjunto.
      </p>
    </div>
  )
}

function ProcedimientoMediaGeometricaDidactico({ mg }) {
  const v = latexLiteral(mg.valor)
  const desarrollo = `\\begin{aligned}
\\mathrm{MG} &= \\sqrt[n]{x_1 \\cdot x_2 \\cdots x_n} \\\\
\\mathrm{MG} &= ${v} \\\\
\\mathrm{MG} &= ${v}
\\end{aligned}`
  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <p className="rounded-xl border border-amber-300/70 border-dashed bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-900/90">
        1. Se verifica que todos los datos sean positivos. <br />
        2. Se combina el conjunto mediante la raíz enésima del producto (equivalente al método logarítmico). <br />
        3. El resultado obtenido corresponde a la media geométrica.
      </p>
    </div>
  )
}

function ProcedimientoMediaArmonicaDidactico({ ma }) {
  const n = latexLiteral(ma.n)
  const v = latexLiteral(ma.valor)
  const desarrollo = `\\begin{aligned}
\\mathrm{MH} &= \\frac{n}{\\sum \\frac{1}{x_i}} \\\\
\\mathrm{MH} &= \\frac{${n}}{\\sum \\frac{1}{x_i}} \\\\
\\mathrm{MH} &= ${v}
\\end{aligned}`
  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <p className="rounded-xl border border-amber-300/70 border-dashed bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-900/90">
        1. Se calcula la suma de inversos {'\\(\\sum \\frac{1}{x_i}\\)'}. <br />
        2. Se divide la cantidad total de datos \\(n\\) entre esa suma. <br />
        3. El cociente obtenido corresponde a la media armónica.
      </p>
    </div>
  )
}

function ProcedimientoAsimetriaDidactico({ asimetria }) {
  const n = latexLiteral(asimetria?.n)
  const media = latexLiteral(asimetria?.media)
  const desv = latexLiteral(asimetria?.desv)
  const sumaCubos = latexLiteral(asimetria?.suma_cubos)
  const valor = latexLiteral(asimetria?.valor)
  const desarrollo = `\\begin{aligned}
g_1 &= \\frac{\\frac{1}{N} \\sum_{i=1}^{n} (X_i - \\bar{X})^3}{S^3} \\\\
g_1 &= \\frac{\\frac{1}{${n}} (${sumaCubos})}{(${desv})^3} \\\\
g_1 &= ${valor}
\\end{aligned}`

  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <div className="text-sm text-neutral-600 mb-4 ml-4">
        <p className="font-semibold">Donde:</p>
        <p>g_1 = Momento central 3 o coeficiente de asimetría</p>
        <p>X_i = Valor de cada uno de los datos</p>
        <p>X&#772; = Media ({media})</p>
        <p>S = Desviación estándar ({desv})</p>
        <p>N = número de datos ({n})</p>
      </div>
    </div>
  )
}

function ProcedimientoCurtosisDidactico({ curtosis }) {
  const n = latexLiteral(curtosis?.n)
  const media = latexLiteral(curtosis?.media)
  const desv = latexLiteral(curtosis?.desv)
  const sumaCuartas = latexLiteral(curtosis?.suma_cuartas)
  const valor = latexLiteral(curtosis?.valor)
  const desarrollo = `\\begin{aligned}
g_2 &= \\frac{\\frac{1}{N} \\sum_{i=1}^{n} (X_i - \\bar{X})^4}{S^4} - 3 \\\\
g_2 &= \\frac{\\frac{1}{${n}} (${sumaCuartas})}{(${desv})^4} - 3 \\\\
g_2 &= ${valor}
\\end{aligned}`

  return (
    <div className="space-y-5">
      <div className="procedimiento-formula text-3xl my-6 py-2 mb-8">
        <BlockMath math={desarrollo} />
      </div>
      <div className="text-sm text-neutral-600 mb-4 ml-4">
        <p className="font-semibold">Donde:</p>
        <p>g_2 = Momento central 4 o coeficiente de curtosis</p>
        <p>X_i = Valor de cada uno de los datos</p>
        <p>X&#772; = Media ({media})</p>
        <p>σ = Desviación estándar ({desv})</p>
        <p>N = número de datos ({n})</p>
      </div>
    </div>
  )
}

/** Construye el nodo MetricCard para una clave o null si no aplica. */
function tarjetaMetricaPorClave(
  k,
  tc,
  disp,
  seleccion,
  cardProps = {},
  distribucionFrecuencias = null,
  medidasEspeciales = null,
  medidasPosicion = null,
  inputPercentil,
  setInputPercentil,
  medidasForma = null,
  esMuestra = false,
  tituloGrupoDatos = '',
) {
  if (!seleccion[k]) return null
  const props = { ...cardProps }
  switch (k) {
    case 'media':
      return tc?.media ? (
        <MetricCard
          key={k}
          titulo="Media"
          valor={tc.media.valor}
          procedimientoNodo={<ProcedimientoMediaDidactico media={tc.media} />}
          {...props}
        />
      ) : null
    case 'mediana':
      return tc?.mediana ? (
        <MetricCard
          key={k}
          titulo="Mediana"
          valor={tc.mediana.valor}
          procedimientoNodo={<ProcedimientoMedianaDidactico mediana={tc.mediana} />}
          {...props}
        />
      ) : null
    case 'moda':
      return tc?.moda ? (
        <MetricCard
          key={k}
          titulo="Moda"
          valor={tc.moda.valor}
          procedimientoNodo={<ProcedimientoModaDidactico moda={tc.moda} />}
          {...props}
        />
      ) : null
    case 'rango':
      return disp?.rango ? (
        <MetricCard
          key={k}
          titulo="Rango"
          valor={disp.rango.valor}
          procedimientoNodo={<ProcedimientoRangoDidactico r={disp.rango} />}
          {...props}
        />
      ) : null
    case 'varianza':
      return disp?.varianza ? (
        <MetricCard
          key={k}
          titulo="Varianza"
          valor={disp.varianza.valor}
          procedimientoNodo={
            <ProcedimientoVarianzaDidactico vr={disp.varianza} esMuestra={esMuestra} />
          }
          {...props}
        />
      ) : null
    case 'desviacion':
      return disp?.desviacion_estandar ? (
        <MetricCard
          key={k}
          titulo="Desviación estándar"
          valor={disp.desviacion_estandar.valor}
          procedimientoNodo={
            <ProcedimientoDesviacionDidactico d={disp.desviacion_estandar} vr={disp.varianza} />
          }
          {...props}
        />
      ) : null
    case 'cv':
      return disp?.coeficiente_variacion ? (
        <MetricCard
          key={k}
          titulo="Coef. de variación (%)"
          valor={disp.coeficiente_variacion.valor}
          procedimientoNodo={<ProcedimientoCvDidactico cv={disp.coeficiente_variacion} />}
          {...props}
        />
      ) : null
    case 'media_geometrica': {
      const mg = medidasEspeciales?.media_geometrica
      const aplicable = mg != null && mg.valor != null
      return (
        <MetricCard
          key={k}
          titulo="Media geométrica"
          valor={aplicable ? mg.valor : null}
          valorNulo="N/A"
          procedimientoNodo={
            aplicable ? (
              <ProcedimientoMediaGeometricaDidactico mg={mg} />
            ) : undefined
          }
          formula={aplicable ? undefined : formulaMediaGeometricaDefinicionLaTeX()}
          avisoProcedimiento={
            !aplicable ? (
              <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm font-medium text-amber-900/95">
                No aplicable para valores ≤ 0.
              </p>
            ) : null
          }
          {...props}
        />
      )
    }
    case 'media_armonica': {
      const ma = medidasEspeciales?.media_armonica
      const aplicable = ma != null && ma.valor != null
      return (
        <MetricCard
          key={k}
          titulo="Media armónica"
          valor={aplicable ? ma.valor : null}
          valorNulo="N/A"
          procedimientoNodo={
            aplicable ? <ProcedimientoMediaArmonicaDidactico ma={ma} /> : undefined
          }
          formula={aplicable ? undefined : formulaMediaArmonicaDefinicionLaTeX()}
          avisoProcedimiento={
            !aplicable ? (
              <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm font-medium text-amber-900/95">
                No aplicable para valores ≤ 0.
              </p>
            ) : null
          }
          {...props}
        />
      )
    }
    case 'medias_moviles':
      return (
        <TarjetaMediasMoviles
          key={k}
          filas={medidasEspeciales?.medias_moviles}
          tituloGrupoDatos={tituloGrupoDatos}
          {...props}
        />
      )
    case 'cuartiles':
      return <TarjetaCuartilesPosicion key={k} mp={medidasPosicion} {...props} />
    case 'deciles':
      return <TarjetaDecilesPosicion key={k} mp={medidasPosicion} {...props} />
    case 'percentiles':
      return (
        <TarjetaPercentilesPosicion
          key={k}
          mp={medidasPosicion}
          inputPercentil={inputPercentil}
          setInputPercentil={setInputPercentil}
          {...props}
        />
      )
    case 'asimetria': {
      const mf = medidasForma?.asimetria
      return (
        <MetricCard
          key={k}
          titulo="ASIMETRÍA (Sesgo)"
          tituloUppercase={false}
          valor={mf?.valor ?? null}
          valorNulo="N/A"
          procedimientoNodo={<ProcedimientoAsimetriaDidactico asimetria={mf} />}
          clasificacionPill={mf?.clasificacion}
          clasificacionPillVariant="coral"
          {...props}
        />
      )
    }
    case 'curtosis': {
      const mf = medidasForma?.curtosis
      return (
        <MetricCard
          key={k}
          titulo="CURTOSIS"
          tituloUppercase={false}
          valor={mf?.valor ?? null}
          valorNulo="N/A"
          procedimientoNodo={<ProcedimientoCurtosisDidactico curtosis={mf} />}
          clasificacionPill={mf?.clasificacion}
          clasificacionPillVariant="teal"
          {...props}
        />
      )
    }
    case 'frecuencias':
      return (
        <TarjetaDistribucionFrecuencias
          key={k}
          distribucion={distribucionFrecuencias}
          tituloGrupoDatos={tituloGrupoDatos}
          {...props}
        />
      )
    default:
      return null
  }
}

function MetricCard({
  titulo,
  valor,
  valorNulo = '—',
  formula,
  procedimientoNodo = null,
  ingredientes,
  avisoProcedimiento = null,
  clasificacionPill = null,
  clasificacionPillVariant = 'coral',
  tituloUppercase = true,
  className = '',
  destacada = false,
  sinMarcoExterno = false,
  mostrarChevronDecorativo = true,
  carruselNavegacion = null,
  carruselPaginacion = null,
}) {
  const mostrar =
    valor === null || valor === undefined
      ? valorNulo
      : formatearValorPrincipalTarjeta(valor)
  const mostrarProcedimiento = Boolean(procedimientoNodo) || Boolean(formula)

  const clasesContenedor = sinMarcoExterno
    ? `flex min-h-0 min-w-0 flex-1 flex-col bg-transparent ${className}`
    : `flex min-h-0 min-w-0 flex-1 flex-col rounded-[1.5rem] border border-neutral-100/90 bg-neutral-50/40 p-4 shadow-sm shadow-neutral-900/[0.06] transition-shadow duration-300 hover:shadow-md hover:shadow-brand-500/[0.08] sm:p-5 ${className}`

  const tituloValorNaranja = (
    <>
      <p
        className={`text-[11px] font-semibold tracking-[0.14em] text-white/90 ${
          tituloUppercase ? 'uppercase' : ''
        }`}
      >
        {titulo}
      </p>
      <p
        className={`mt-2 font-mono font-bold tabular-nums tracking-tight text-white ${
          destacada ? 'text-3xl md:text-4xl' : 'text-2xl'
        }`}
      >
        {mostrar}
      </p>
      {clasificacionPill ? (
        <span
          className={`mt-2.5 inline-block max-w-[min(100%,20rem)] rounded-full px-3 py-1 text-sm font-semibold leading-snug shadow-sm ${
            clasificacionPillVariant === 'teal'
              ? 'bg-teal-100 text-teal-800'
              : 'bg-orange-100 text-orange-800'
          }`}
        >
          {clasificacionPill}
        </span>
      ) : null}
    </>
  )

  function renderCabeceraNaranja() {
    if (carruselNavegacion) {
      return (
        <div className="flex shrink-0 items-center bg-[#E97F4A] py-6 sm:py-7">
          <button
            type="button"
            aria-label="Métrica anterior"
            onClick={carruselNavegacion.onAnterior}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-200 ease-out hover:scale-[1.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11 sm:w-11"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />
          </button>
          <div className="min-w-0 flex-1 px-2 text-center sm:px-3">{tituloValorNaranja}</div>
          <button
            type="button"
            aria-label="Siguiente métrica"
            onClick={carruselNavegacion.onSiguiente}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-200 ease-out hover:scale-[1.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11 sm:w-11"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      )
    }
    if (mostrarChevronDecorativo) {
      return (
        <div className="shrink-0 bg-[#E97F4A] px-6 py-7 text-center sm:px-8 sm:py-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 text-center">{tituloValorNaranja}</div>
            <ChevronRight
              className="mt-0.5 h-5 w-5 shrink-0 text-white/70 transition-colors hover:text-white"
              strokeWidth={2}
              aria-hidden
            />
          </div>
        </div>
      )
    }
    return (
      <div className="shrink-0 bg-[#E97F4A] px-6 py-7 text-center sm:px-8 sm:py-8">
        {tituloValorNaranja}
      </div>
    )
  }

  return (
    <div className={clasesContenedor.trim()}>
      {mostrarProcedimiento ? (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-neutral-200/90 bg-white shadow-sm shadow-neutral-900/10">
          {renderCabeceraNaranja()}
          <div className="flex min-h-0 min-w-0 flex-[1_1_75%] flex-col bg-white">
            <p className="shrink-0 px-5 pb-2 pt-4 text-[10px] font-bold uppercase tracking-widest text-[#E8956A] sm:px-6">
              Procedimiento
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-y-contain px-5 pb-5 pt-0 text-gray-900 sm:px-6 sm:pb-6 [&_.katex]:text-[1.35rem]">
              {procedimientoNodo ? (
                <>
                  {procedimientoNodo}
                  {avisoProcedimiento}
                </>
              ) : (
                <>
                  {formula ? <BlockMath math={formula} /> : null}
                  {avisoProcedimiento}
                  {ingredientes && Object.keys(ingredientes).length > 0 && (
                    <dl className="mt-4 grid gap-1.5 border-t border-neutral-200/90 pt-4 text-[11px] text-gray-600">
                      {Object.entries(ingredientes).map(([kk, v]) => (
                        <div
                          key={kk}
                          className="flex flex-wrap justify-between gap-x-2 gap-y-0.5"
                        >
                          <dt className="font-semibold text-gray-400">
                            {kk.replace(/_/g, ' ')}
                          </dt>
                          <dd className="font-mono text-gray-900">
                            {v === null || v === undefined ? '—' : String(v)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              )}
            </div>
          </div>
          {carruselPaginacion && carruselPaginacion.total > 0 ? (
            <div
              className="shrink-0 border-t border-neutral-200/80 bg-white px-4 py-2.5 text-center text-xs tabular-nums text-gray-400 sm:px-6"
              aria-live="polite"
            >
              {carruselPaginacion.actual} / {carruselPaginacion.total}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#E97F4A]/35 bg-white shadow-sm shadow-neutral-900/10">
          {carruselNavegacion ? (
            renderCabeceraNaranja()
          ) : mostrarChevronDecorativo ? (
            <div className="flex shrink-0 items-start justify-between gap-3 overflow-hidden rounded-[18px] bg-[#E97F4A] px-6 py-7 text-center sm:px-8 sm:py-8">
              <div className="flex w-full items-start justify-between gap-3">
                <div className="min-w-0 flex-1 text-center">{tituloValorNaranja}</div>
                <ChevronRight
                  className="mt-0.5 h-5 w-5 shrink-0 text-white/70 transition-colors hover:text-white"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
            </div>
          ) : (
            <div className="shrink-0 overflow-hidden rounded-[18px] bg-[#E97F4A] px-6 py-7 text-center shadow-[0_4px_24px_-4px_rgba(15,23,42,0.1)] sm:px-8 sm:py-8">
              {tituloValorNaranja}
            </div>
          )}
          {carruselPaginacion && carruselPaginacion.total > 0 ? (
            <div
              className="shrink-0 border-t border-white/25 bg-white px-4 py-2.5 text-center text-xs tabular-nums text-gray-400 sm:px-6"
              aria-live="polite"
            >
              {carruselPaginacion.actual} / {carruselPaginacion.total}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function BannerDatosProcesados({ datosProc, className = '' }) {
  if (!datosProc) return null
  const [mostrarAyuda, setMostrarAyuda] = useState(false)
  const ayudaBtnRef = useRef(null)
  const ayudaPopoverRef = useRef(null)
  const [ayudaPos, setAyudaPos] = useState({ top: 0, left: 0 })
  const metodo = datosProc.metodo === 'completo' ? 'Sin muestreo' : datosProc.metodo
  const metodoClave = datosProc.metodo

  function contenidoAyudaMuestreo() {
    if (metodoClave === 'sistematico') {
      return (
        <>
          <h4 className="mb-1 font-bold text-[#E97F4A]">Muestreo Sistemático</h4>
          <p>
            Se determinó un intervalo de salto <span className="font-semibold">'k'</span> dividiendo
            la población total (N) entre la muestra deseada (n).
          </p>
          <p className="mt-1">
            Fórmula: <InlineMath math={'k = \\frac{N}{n}'} />
          </p>
          <p className="mt-1">
            Se elige un punto de arranque al azar y se seleccionan elementos saltando de k en k,
            garantizando una cobertura uniforme de la base de datos.
          </p>
        </>
      )
    }
    if (metodoClave === 'estratos') {
      return (
        <>
          <h4 className="mb-1 font-bold text-teal-600">Muestreo Estratificado</h4>
          <p>
            La población se agrupa por características en grupos internamente homogéneos llamados
            <span className="font-semibold"> Estratos</span> (ej. por niveles o categorías).
          </p>
          <p className="mt-1">
            Luego, se extrae una muestra proporcional aleatoria de cada estrato para asegurar que
            todos los subgrupos estén representados.
          </p>
        </>
      )
    }
    if (metodoClave === 'conglomerados') {
      return (
        <>
          <h4 className="mb-1 font-bold text-orange-600">Muestreo por Conglomerados</h4>
          <p>
            La población ya está dividida naturalmente en grupos heterogéneos llamados
            <span className="font-semibold"> Conglomerados</span> (ej. sucursales, aulas).
          </p>
          <p className="mt-1">
            En lugar de elegir individuos, se seleccionan conglomerados completos al azar y se
            evalúan todos sus elementos.
          </p>
        </>
      )
    }
    return null
  }

  const mostrarBotonAyuda = ['sistematico', 'estratos', 'conglomerados'].includes(metodoClave)
  const ayudaNodo = contenidoAyudaMuestreo()

  const actualizarPosAyuda = useCallback(() => {
    const el = ayudaBtnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const maxW = 384
    const alturaEstimada = 220
    let left = r.left + r.width / 2 - maxW / 2
    left = Math.max(8, Math.min(left, window.innerWidth - maxW - 8))
    const top = Math.max(8, r.top - alturaEstimada * 0.7 - 10)
    setAyudaPos({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!mostrarAyuda) return
    actualizarPosAyuda()
    window.addEventListener('resize', actualizarPosAyuda)
    window.addEventListener('scroll', actualizarPosAyuda, true)
    return () => {
      window.removeEventListener('resize', actualizarPosAyuda)
      window.removeEventListener('scroll', actualizarPosAyuda, true)
    }
  }, [mostrarAyuda, actualizarPosAyuda])

  useEffect(() => {
    if (!mostrarAyuda) return
    function onClickOutside(e) {
      const t = ayudaBtnRef.current
      const p = ayudaPopoverRef.current
      if (t?.contains(e.target) || p?.contains(e.target)) return
      setMostrarAyuda(false)
    }
    function onEscape(e) {
      if (e.key === 'Escape') setMostrarAyuda(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [mostrarAyuda])

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-2xl border border-[#E97F4A]/20 bg-[#FFF6F0] px-4 py-3 text-sm shadow-sm shadow-[#E97F4A]/[0.06] ${className}`}
    >
      <span className="font-semibold text-gray-900">
        Datos procesados:{' '}
        <span className="font-mono text-gray-900">n = {datosProc.n_muestra}</span>
        {datosProc.n_original !== datosProc.n_muestra && (
          <span className="text-gray-500"> de {datosProc.n_original} originales</span>
        )}
      </span>
      <div className="relative inline-flex items-center gap-1.5">
        <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-[#D66B38] ring-1 ring-[#E97F4A]/15">
          {metodo}
        </span>
        {mostrarBotonAyuda && ayudaNodo ? (
          <>
            <button
              ref={ayudaBtnRef}
              type="button"
              onClick={() => setMostrarAyuda((v) => !v)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#E97F4A]/40 bg-white text-xs font-bold text-[#E97F4A] shadow-sm transition hover:bg-[#FFF1E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/45"
              aria-label="Ver explicación del tipo de muestreo"
              title="Ver explicación del tipo de muestreo"
            >
              ?
            </button>
            {mostrarAyuda && typeof document !== 'undefined'
              ? createPortal(
                  <div
                    ref={ayudaPopoverRef}
                    className="fixed z-[110] w-[min(90vw,24rem)] rounded-xl border border-[#E97F4A]/25 bg-white px-3 py-2.5 text-xs leading-snug text-gray-800 shadow-lg shadow-[#E97F4A]/10 ring-1 ring-neutral-900/5"
                    style={{ top: ayudaPos.top, left: ayudaPos.left }}
                  >
                    {ayudaNodo}
                  </div>,
                  document.body,
                )
              : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

function SegmentoPoblacionMuestra({ esMuestra, onCambiar }) {
  return (
    <div
      className="inline-flex w-full rounded-2xl bg-neutral-100/90 p-1 ring-1 ring-neutral-100 sm:w-auto"
      role="group"
      aria-label="Tipo de conjunto estadístico"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!esMuestra}
        onClick={() => onCambiar(false)}
        className={`relative z-10 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/50 focus-visible:ring-offset-2 sm:min-w-[7.5rem] sm:flex-none ${
          !esMuestra
            ? 'bg-[#E97F4A] text-white shadow-md shadow-[#E97F4A]/25 ring-1 ring-[#E97F4A]/35'
            : 'text-gray-400 hover:text-gray-900'
        }`}
      >
        Población
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={esMuestra}
        onClick={() => onCambiar(true)}
        className={`relative z-10 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/50 focus-visible:ring-offset-2 sm:min-w-[7.5rem] sm:flex-none ${
          esMuestra
            ? 'bg-[#E97F4A] text-white shadow-md shadow-[#E97F4A]/25 ring-1 ring-[#E97F4A]/35'
            : 'text-gray-400 hover:text-gray-900'
        }`}
      >
        Muestra
      </button>
    </div>
  )
}

function App() {
  const [moduloPrincipal, setModuloPrincipal] = useState('calculadora')
  const [inputTab, setInputTab] = useState('texto')
  const [texto, setTexto] = useState('')
  const [esMuestra, setEsMuestra] = useState(false)
  const [porcentajeMuestra, setPorcentajeMuestra] = useState(100)
  const [porcentajeMuestraDraft, setPorcentajeMuestraDraft] = useState('100')
  const [metodoMuestreo, setMetodoMuestreo] = useState('simple')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [fileName, setFileName] = useState('')
  const [excelInputKey, setExcelInputKey] = useState(0)
  const [excelHeaders, setExcelHeaders] = useState([])
  const [excelRows, setExcelRows] = useState([])
  const [selectedColumn, setSelectedColumn] = useState('')
  const [datosEntrada, setDatosEntrada] = useState([])
  const [metricasSeleccionadas, setMetricasSeleccionadas] = useState({
    media: false,
    mediana: false,
    moda: false,
    rango: false,
    varianza: false,
    desviacion: false,
    cv: false,
    media_geometrica: false,
    media_armonica: false,
    medias_moviles: false,
    cuartiles: false,
    deciles: false,
    percentiles: false,
    asimetria: false,
    curtosis: false,
    frecuencias: false,
  })
  const [inputPercentil, setInputPercentil] = useState(50)
  const [indiceCarruselMetricas, setIndiceCarruselMetricas] = useState(0)
  const [ayudaPorcentajeVisible, setAyudaPorcentajeVisible] = useState(false)
  const ayudaPorcentajeBtnRef = useRef(null)
  const ayudaPorcentajePopoverRef = useRef(null)
  const [ayudaPorcentajePos, setAyudaPorcentajePos] = useState({ top: 0, left: 0 })

  function toggleMetrica(key) {
    setMetricasSeleccionadas((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function marcarTodasMetricas(activo) {
    setMetricasSeleccionadas((prev) =>
      Object.fromEntries(Object.keys(prev).map((k) => [k, activo])),
    )
  }

  function obtenerDatosParaCalculo() {
    if (inputTab === 'texto') {
      return parsearNumerosTexto(texto)
    }
    return datosEntrada
  }

  /** Valor 1–100 para la API a partir del texto del campo (vacío → 100). */
  function normalizarPorcentajeMuestraParaEnvio() {
    const t = porcentajeMuestraDraft.trim()
    if (t === '') return 100
    const n = parseInt(t, 10)
    if (Number.isNaN(n)) return porcentajeMuestra
    return Math.min(100, Math.max(1, n))
  }

  useEffect(() => {
    if (esMuestra) {
      setPorcentajeMuestraDraft(String(porcentajeMuestra))
    }
  }, [esMuestra])

  const actualizarPosAyudaPorcentaje = useCallback(() => {
    const el = ayudaPorcentajeBtnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const maxW = 280
    let left = r.left + r.width / 2 - maxW / 2
    left = Math.max(8, Math.min(left, window.innerWidth - maxW - 8))
    setAyudaPorcentajePos({ top: r.bottom + 8, left })
  }, [])

  useLayoutEffect(() => {
    if (!ayudaPorcentajeVisible) return
    actualizarPosAyudaPorcentaje()
    window.addEventListener('resize', actualizarPosAyudaPorcentaje)
    window.addEventListener('scroll', actualizarPosAyudaPorcentaje, true)
    return () => {
      window.removeEventListener('resize', actualizarPosAyudaPorcentaje)
      window.removeEventListener('scroll', actualizarPosAyudaPorcentaje, true)
    }
  }, [ayudaPorcentajeVisible, actualizarPosAyudaPorcentaje])

  useEffect(() => {
    if (!esMuestra) setAyudaPorcentajeVisible(false)
  }, [esMuestra])

  useEffect(() => {
    if (!ayudaPorcentajeVisible) return
    function cerrarSiFuera(e) {
      if (
        ayudaPorcentajeBtnRef.current?.contains(e.target) ||
        ayudaPorcentajePopoverRef.current?.contains(e.target)
      ) {
        return
      }
      setAyudaPorcentajeVisible(false)
    }
    document.addEventListener('mousedown', cerrarSiFuera)
    return () => document.removeEventListener('mousedown', cerrarSiFuera)
  }, [ayudaPorcentajeVisible])

  useEffect(() => {
    if (!ayudaPorcentajeVisible) return
    function escape(e) {
      if (e.key === 'Escape') setAyudaPorcentajeVisible(false)
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [ayudaPorcentajeVisible])

  async function calcular() {
    setError(null)
    setResultado(null)

    const datos = obtenerDatosParaCalculo()
    if (datos.length < 2) {
      setError(
        inputTab === 'texto'
          ? 'Introduce al menos dos números válidos (espacio, salto de línea o ; · decimales con coma o punto).'
          : 'Selecciona una columna del Excel con al menos dos números válidos.',
      )
      return
    }

    const pctMuestra = esMuestra ? normalizarPorcentajeMuestraParaEnvio() : 100
    if (esMuestra) {
      setPorcentajeMuestra(pctMuestra)
      setPorcentajeMuestraDraft(String(pctMuestra))
    }

    const body = {
      datos,
      es_muestra: esMuestra,
      porcentaje_muestra: pctMuestra,
      metodo_muestreo: metodoMuestreo,
    }

    setCargando(true)
    try {
      const res = await fetch(`${API_BASE}/api/descriptiva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.detail ?? 'Error en el servidor')
        return
      }
      if (json.error) {
        setError(json.error)
        return
      }
      setResultado(json)
    } catch {
      setError('No se pudo conectar con la API. ¿Está el backend en marcha?')
    } finally {
      setCargando(false)
    }
  }

  function procesarArchivo(file) {
    setError(null)
    setResultado(null)
    setExcelHeaders([])
    setExcelRows([])
    setSelectedColumn('')
    setDatosEntrada([])
    setFileName(file?.name ?? '')

    if (!file) return
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError('Archivo no válido. Sube un Excel con extensión .xlsx o .xls.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const primeraHoja = workbook.SheetNames[0]
        if (!primeraHoja) {
          setError('El archivo Excel no contiene hojas.')
          return
        }
        const worksheet = workbook.Sheets[primeraHoja]
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        if (!rows.length) {
          setError('El archivo Excel está vacío o no tiene filas con datos.')
          return
        }
        const headersSet = new Set()
        rows.forEach((row) => {
          Object.keys(row).forEach((key) => headersSet.add(String(key)))
        })
        const headers = Array.from(headersSet)
        if (!headers.length) {
          setError('No se detectaron columnas válidas en el Excel.')
          return
        }
        setExcelHeaders(headers)
        setExcelRows(rows)
      } catch {
        setError('No se pudo leer el archivo. Verifica que sea un Excel válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function limpiarExcel() {
    setFileName('')
    setExcelHeaders([])
    setExcelRows([])
    setSelectedColumn('')
    setDatosEntrada([])
    setResultado(null)
    setError(null)
    setExcelInputKey((k) => k + 1)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    maxFiles: 1,
    onDrop: (files) => {
      if (!files || files.length === 0) {
        setError('No se pudo leer el archivo seleccionado.')
        return
      }
      procesarArchivo(files[0])
    },
  })

  function seleccionarColumna(columna) {
    setSelectedColumn(columna)
    setResultado(null)
    if (!columna) {
      setDatosEntrada([])
      return
    }
    const datos = excelRows
      .map((row) => parsearNumeroFlexible(row[columna]))
      .filter((n) => n !== null)
    setDatosEntrada(datos)
  }

  const tc = resultado?.tendencia_central
  const disp = resultado?.dispersion
  const datosProc = resultado?.datos_procesados
  const distribucionFrecuencias = resultado?.distribucion_frecuencias
  const medidasEspeciales = resultado?.medidas_especiales
  const medidasPosicion = resultado?.medidas_posicion
  const medidasForma = resultado?.medidas_forma
  const tituloGrupoDatos =
    inputTab === 'excel' && typeof selectedColumn === 'string' && selectedColumn.trim() !== ''
      ? selectedColumn
      : ''

  const datosListos = obtenerDatosParaCalculo()
  const puedeProcesar = datosListos.length >= 2 && !cargando

  const slidesMetricas = useMemo(() => {
    const items = []
    for (const k of ORDEN_METRICAS) {
      const node = tarjetaMetricaPorClave(
        k,
        tc,
        disp,
        metricasSeleccionadas,
        {
          destacada: true,
          sinMarcoExterno: true,
          mostrarChevronDecorativo: false,
          className: '',
        },
        distribucionFrecuencias,
        medidasEspeciales,
        medidasPosicion,
        inputPercentil,
        setInputPercentil,
        medidasForma,
        esMuestra,
        tituloGrupoDatos,
      )
      if (node) items.push({ key: k, node })
    }
    return items
  }, [
    tc,
    disp,
    metricasSeleccionadas,
    distribucionFrecuencias,
    medidasEspeciales,
    medidasPosicion,
    inputPercentil,
    medidasForma,
    esMuestra,
    tituloGrupoDatos,
  ])

  useEffect(() => {
    setIndiceCarruselMetricas(0)
  }, [resultado])

  useEffect(() => {
    setIndiceCarruselMetricas((i) =>
      slidesMetricas.length === 0 ? 0 : Math.min(i, slidesMetricas.length - 1),
    )
  }, [slidesMetricas.length])

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-transparent text-left font-sans text-gray-900 antialiased max-lg:min-h-svh lg:h-full lg:overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-[95%] flex-1 flex-col px-4 pb-8 pt-5 sm:px-6 lg:max-h-full lg:px-6 lg:pb-4 lg:pt-4 xl:max-w-[1600px]">
        <header className="mb-4 shrink-0 space-y-3 border-b border-neutral-200/60 pb-3 lg:mb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#FFC300]">
              Panel Analítico
            </p>
            <h1 className="!mt-0 !text-xl font-bold tracking-tight text-[#E97F4A] sm:!text-2xl">
              Calculadora de Estadística
            </h1>
          </div>
          <div
            className="flex rounded-2xl bg-neutral-100/90 p-1 ring-1 ring-neutral-100"
            role="tablist"
            aria-label="Módulos de la aplicación"
          >
            {MODULOS_APP.map((mod) => (
              <button
                key={mod.id}
                type="button"
                role="tab"
                aria-selected={moduloPrincipal === mod.id}
                onClick={() => setModuloPrincipal(mod.id)}
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/45 sm:text-sm ${
                  moduloPrincipal === mod.id
                    ? 'bg-white text-[#E97F4A] shadow-sm ring-1 ring-neutral-100'
                    : 'text-gray-400 hover:text-[#E97F4A]/85'
                }`}
              >
                {mod.label}
              </button>
            ))}
          </div>
        </header>

        {moduloPrincipal === 'corpus' ? (
          <AnalisisCorpus apiBase={API_BASE} />
        ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[2fr_1fr_2fr] lg:gap-6">
          {/* Columna 1: entrada (~20% más ancha vs reparto 4/3/5; col 2 ~20% más estrecha) */}
          <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:h-full lg:max-h-full">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-[#F2C4A8]/50 bg-[#FFF6F0] p-4 shadow-sm shadow-[#E97F4A]/10 sm:p-5 lg:max-h-full">
              <p className="mb-2 shrink-0 text-xs font-bold uppercase tracking-wider text-gray-400">
                Entrada y configuración
              </p>
              <div
                className="mb-3 flex shrink-0 rounded-2xl bg-neutral-100/90 p-1 ring-1 ring-neutral-100"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={inputTab === 'texto'}
                  onClick={() => setInputTab('texto')}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/45 ${
                    inputTab === 'texto'
                      ? 'bg-white text-[#E97F4A] shadow-sm ring-1 ring-neutral-100'
                      : 'text-gray-400 hover:text-[#E97F4A]/85'
                  }`}
                >
                  Texto
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inputTab === 'excel'}
                  onClick={() => setInputTab('excel')}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/45 ${
                    inputTab === 'excel'
                      ? 'bg-white text-[#E97F4A] shadow-sm ring-1 ring-neutral-100'
                      : 'text-gray-400 hover:text-[#E97F4A]/85'
                  }`}
                >
                  Excel
                </button>
              </div>

              {inputTab === 'texto' ? (
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Ej: 1,04  2,5  3 (separados por espacio, salto de línea o ;)"
                  rows={3}
                  spellCheck={false}
                  className="w-full min-h-[5rem] flex-1 resize-none overflow-y-auto rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 font-mono text-sm leading-relaxed text-gray-900 accent-[#E97F4A] placeholder:text-gray-400 focus:border-[#E97F4A] focus:outline-none focus:ring-4 focus:ring-[#E97F4A]/20 lg:min-h-0 lg:resize-y"
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                  {excelHeaders.length === 0 ? (
                    <div
                      key={excelInputKey}
                      {...getRootProps()}
                      className={`flex min-h-[5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-4 text-center transition-all sm:px-5 sm:py-5 lg:min-h-0 ${
                        isDragActive
                          ? 'border-[#E97F4A]/50 bg-[#E97F4A]/10'
                          : 'border-[#E97F4A]/30 bg-white hover:border-[#E97F4A]/40 hover:bg-[#E97F4A]/5'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <FileSpreadsheet
                        className="h-8 w-8 text-[#E97F4A]/55 sm:h-9 sm:w-9"
                        aria-hidden
                      />
                      <p className="text-sm font-semibold text-[#E97F4A]/80">
                        Arrastra tu Excel aquí o haz clic
                      </p>
                      <p className="text-xs text-[#E97F4A]/50">.xlsx · .xls</p>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 shadow-sm">
                      <FileSpreadsheet
                        className="h-5 w-5 shrink-0 text-[#E97F4A]/70"
                        aria-hidden
                      />
                      <p
                        className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800"
                        title={fileName}
                      >
                        {fileName || 'Excel cargado'}
                      </p>
                      <button
                        type="button"
                        onClick={limpiarExcel}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/40"
                        aria-label="Quitar archivo Excel y elegir otro"
                        title="Quitar archivo"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  )}
                  {fileName && excelHeaders.length === 0 && (
                    <p className="shrink-0 text-xs font-medium text-[#E97F4A]/70">Archivo: {fileName}</p>
                  )}
                  {excelHeaders.length > 0 && (
                    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                      <div className="shrink-0">
                        <label
                          htmlFor="excel-column-select"
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-400"
                        >
                          Columna a calcular
                        </label>
                        <SelectorColumnaExcel
                          id="excel-column-select"
                          value={selectedColumn}
                          onChange={seleccionarColumna}
                          opciones={excelHeaders}
                        />
                      </div>
                      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-neutral-100 bg-white text-xs shadow-sm">
                        <table className="w-full min-w-max border-collapse text-left">
                          <thead className="sticky top-0 z-[1] bg-neutral-50 shadow-[0_1px_0_0_rgb(229_231_235)]">
                            <tr>
                              {excelHeaders.map((h) => (
                                <th key={h} className="whitespace-nowrap border-b px-2 py-2 font-semibold text-gray-900">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {excelRows.slice(0, 10).map((row, i) => (
                              <tr key={i} className="odd:bg-white even:bg-neutral-50/50">
                                {excelHeaders.map((h) => (
                                  <td key={h} className="border-b border-neutral-100 px-2 py-1.5 text-neutral-600">
                                    {String(row[h] ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 shrink-0 border-t border-neutral-100 pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Marco inferencial
                </p>
                <SegmentoPoblacionMuestra esMuestra={esMuestra} onCambiar={setEsMuestra} />
              </div>

              <div
                className={`shrink-0 overflow-hidden transition-all duration-300 ease-out ${
                  esMuestra ? 'mt-3 max-h-[220px] opacity-100 lg:max-h-[min(280px,28vh)]' : 'max-h-0 opacity-0'
                }`}
                aria-hidden={!esMuestra}
              >
                <div className="rounded-2xl border border-[#E97F4A]/25 bg-[#FFF6F0]/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center gap-2">
                        <label
                          htmlFor="pct-muestra"
                          className="text-xs font-semibold text-[#E97F4A]"
                        >
                          Porcentaje de la muestra (%)
                        </label>
                        <button
                          ref={ayudaPorcentajeBtnRef}
                          type="button"
                          aria-expanded={ayudaPorcentajeVisible}
                          aria-controls="ayuda-pct-muestra"
                          aria-label="Ayuda sobre el porcentaje de muestra"
                          className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border bg-white text-xs font-bold shadow-md shadow-[#E97F4A]/15 transition-colors duration-200 hover:border-[#E97F4A] hover:bg-[#E97F4A]/12 hover:text-[#D66B38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/45 focus-visible:ring-offset-1 ${
                            ayudaPorcentajeVisible
                              ? 'border-[#E97F4A] text-[#E97F4A] ring-2 ring-[#E97F4A]/35'
                              : 'border-[#E97F4A]/45 text-[#E97F4A]'
                          }`}
                          onClick={() => setAyudaPorcentajeVisible((v) => !v)}
                        >
                          ?
                        </button>
                      </div>
                      {ayudaPorcentajeVisible &&
                        typeof document !== 'undefined' &&
                        createPortal(
                          <div
                            ref={ayudaPorcentajePopoverRef}
                            id="ayuda-pct-muestra"
                            role="tooltip"
                            className="fixed z-[100] max-w-[280px] rounded-xl border border-[#E97F4A]/25 bg-white px-3 py-2.5 text-xs leading-snug text-gray-900 shadow-lg shadow-[#E97F4A]/10 ring-1 ring-neutral-900/5"
                            style={{
                              top: ayudaPorcentajePos.top,
                              left: ayudaPorcentajePos.left,
                            }}
                          >
                            <span className="font-mono font-semibold text-[#E97F4A]">&lt; 100</span>
                            {' '}
                            aplica muestreo antes del cálculo (solo si es muestra).
                          </div>,
                          document.body,
                        )}
                      <input
                        id="pct-muestra"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={porcentajeMuestraDraft}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === '') {
                            setPorcentajeMuestraDraft('')
                            return
                          }
                          if (!/^\d+$/.test(v) || v.length > 3) return
                          setPorcentajeMuestraDraft(v)
                        }}
                        onBlur={() => {
                          const t = porcentajeMuestraDraft.trim()
                          if (t === '') {
                            setPorcentajeMuestraDraft('100')
                            setPorcentajeMuestra(100)
                            return
                          }
                          const n = parseInt(t, 10)
                          if (Number.isNaN(n)) {
                            setPorcentajeMuestraDraft(String(porcentajeMuestra))
                            return
                          }
                          const c = Math.min(100, Math.max(1, n))
                          setPorcentajeMuestra(c)
                          setPorcentajeMuestraDraft(String(c))
                        }}
                        className="box-border h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold tabular-nums accent-[#E97F4A] focus:border-[#E97F4A] focus:outline-none focus:ring-4 focus:ring-[#E97F4A]/20"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor="metodo-muestreo"
                        className="mb-1.5 block text-xs font-semibold text-[#E97F4A]"
                      >
                        Método de muestreo
                      </label>
                      <SelectorMetodoMuestreo
                        id="metodo-muestreo"
                        value={metodoMuestreo}
                        onChange={setMetodoMuestreo}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna 2: métricas */}
          <div className="flex min-h-0 min-w-0 flex-col gap-3 lg:h-full lg:max-h-full">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[1.5rem] border border-neutral-100 bg-white p-4 shadow-sm shadow-neutral-900/[0.06] sm:p-5 lg:min-h-0">
              <h2 className="shrink-0 text-base font-bold text-[#E97F4A]">Selecciona qué calcular</h2>
              <p className="mt-1 shrink-0 text-xs text-gray-400">
                Activa las métricas que quieras ver en resultados.
              </p>
              <div className="mt-3 flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => marcarTodasMetricas(true)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-[#E97F4A]/35 hover:text-[#E97F4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/35"
                >
                  Seleccionar todo
                </button>
                <button
                  type="button"
                  onClick={() => marcarTodasMetricas(false)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-[#E97F4A]/35 hover:text-[#E97F4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/35"
                >
                  Deseleccionar todo
                </button>
              </div>
              <div className="mt-4 min-h-0 space-y-5">
                {GRUPOS_METRICAS.map((grupo) => {
                  const IconoGrupo = grupo.icon
                  return (
                  <div key={grupo.titulo}>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#F2A87A]">
                      <IconoGrupo
                        className="h-3.5 w-3.5 shrink-0 text-[#F2A87A]"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      {grupo.titulo}
                    </p>
                    <ul className="space-y-2">
                      {grupo.items.map(({ key, label }) => (
                        <li key={key}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/50 px-3 py-2.5 transition-colors hover:border-brand-200 hover:bg-brand-50/20">
                            <input
                              type="checkbox"
                              checked={metricasSeleccionadas[key]}
                              onChange={() => toggleMetrica(key)}
                              className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                            />
                            <span className="text-sm font-medium text-gray-900">{label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                  )
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={calcular}
              disabled={!puedeProcesar}
              className="w-full shrink-0 rounded-xl bg-[#E97F4A] py-3.5 text-sm font-bold text-white shadow-md shadow-[#E97F4A]/30 transition-all hover:bg-[#D66B38] hover:shadow-lg hover:shadow-[#E97F4A]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E97F4A]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40"
            >
              {cargando ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Procesando…
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Calculator className="h-5 w-5" aria-hidden />
                  Procesar datos
                </span>
              )}
            </button>
          </div>

          {/* Columna 3: resultados — padding para que borde/sombra de MetricCard no los recorte overflow del grid */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden max-lg:min-h-[16rem] px-1.5 pt-1 sm:px-2 sm:pt-1.5 lg:h-full lg:max-h-full">
            {error && (
              <div
                className="mb-3 shrink-0 rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-800"
                role="alert"
              >
                {error}
              </div>
            )}

            {resultado && !cargando && (
              <>
                {slidesMetricas.length === 0 ? (
                  <div className="space-y-4">
                    <p className="rounded-2xl border border-dashed border-neutral-200 bg-[#F9FAFB] px-4 py-8 text-center text-sm text-gray-400">
                      No hay métricas seleccionadas con datos. Marca al menos una en la columna
                      central o recalcula.
                    </p>
                    <BannerDatosProcesados datosProc={datosProc} />
                  </div>
                ) : (
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-0.5">
                    {cloneElement(slidesMetricas[indiceCarruselMetricas].node, {
                      carruselNavegacion: {
                        onAnterior: () =>
                          setIndiceCarruselMetricas(
                            (i) =>
                              (i - 1 + slidesMetricas.length) % slidesMetricas.length,
                          ),
                        onSiguiente: () =>
                          setIndiceCarruselMetricas(
                            (i) => (i + 1) % slidesMetricas.length,
                          ),
                      },
                      carruselPaginacion: {
                        actual: indiceCarruselMetricas + 1,
                        total: slidesMetricas.length,
                      },
                    })}
                    <BannerDatosProcesados datosProc={datosProc} className="mt-3 shrink-0" />
                  </div>
                )}
              </>
            )}

            {!resultado && !error && !cargando && (
              <div className="flex min-h-[12rem] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-[#F9FAFB] py-8 text-center lg:min-h-0">
                <BarChart3 className="mb-3 h-12 w-12 text-gray-300" aria-hidden />
                <p className="max-w-xs text-sm text-gray-400">
                  Configura la entrada, elige métricas y pulsa <strong>Procesar datos</strong> para ver
                  resultados y procedimientos aquí.
                </p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default App
