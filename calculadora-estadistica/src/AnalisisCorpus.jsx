import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Server,
  Table2,
  Upload,
} from 'lucide-react'
import { BlockMath } from 'react-katex'
import ContenidoProbabilidad from './EjerciciosProbabilidad.jsx'

const FUENTES = [
  { id: 'humano', label: 'Humano', archivo: 'humano.txt', color: '#059669' },
  { id: 'copilot', label: 'Copilot', archivo: 'copilot.txt', color: '#2563EB' },
  { id: 'deepseek', label: 'DeepSeek', archivo: 'deepseek.txt', color: '#7C3AED' },
  { id: 'chatgpt', label: 'ChatGPT', archivo: 'chatgpt.txt', color: '#D97706' },
]

const ETIQUETAS_FUENTE = Object.fromEntries(FUENTES.map((f) => [f.id, f.label]))

function formatearNumero(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  return x.toLocaleString('es-ES')
}

export default function AnalisisCorpus({ apiBase }) {
  const [archivosLocales, setArchivosLocales] = useState({
    humano: null,
    copilot: null,
    deepseek: null,
    chatgpt: null,
  })
  const [archivosServidor, setArchivosServidor] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const cargarEstadoServidor = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/corpus/archivos`)
      if (!res.ok) throw new Error('No se pudo consultar el servidor.')
      const data = await res.json()
      setArchivosServidor(data)
    } catch {
      setArchivosServidor(null)
    }
  }, [apiBase])

  useEffect(() => {
    cargarEstadoServidor()
  }, [cargarEstadoServidor])

  function asignarArchivo(fuenteId, file) {
    setArchivosLocales((prev) => ({ ...prev, [fuenteId]: file }))
    setError(null)
  }

  function quitarArchivo(fuenteId) {
    setArchivosLocales((prev) => ({ ...prev, [fuenteId]: null }))
  }

  async function leerTextosLocales() {
    const textos = {}
    const nombres = {}
    for (const { id } of FUENTES) {
      const file = archivosLocales[id]
      if (file) {
        textos[id] = await file.text()
        nombres[id] = file.name
      }
    }
    return { textos, nombres }
  }

  async function analizar({ usarServidor = false } = {}) {
    setCargando(true)
    setError(null)
    setResultado(null)
    try {
      let body = { usar_servidor: usarServidor }
      if (!usarServidor) {
        const { textos, nombres } = await leerTextosLocales()
        if (Object.keys(textos).length === 0) {
          throw new Error('Selecciona al menos un archivo o usa los del servidor.')
        }
        body = { ...body, ...textos, nombres_archivo: nombres, usar_servidor: false }
      }
      const res = await fetch(`${apiBase}/api/corpus/analizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detalle = data.detail
        const mensaje =
          typeof detalle === 'string'
            ? detalle
            : Array.isArray(detalle)
              ? detalle.map((d) => d.msg ?? JSON.stringify(d)).join('; ')
              : 'Error al analizar el corpus.'
        throw new Error(mensaje)
      }
      setResultado(data)
    } catch (e) {
      setError(e.message ?? 'Error desconocido.')
    } finally {
      setCargando(false)
    }
  }

  const hayArchivosLocales = FUENTES.some((f) => archivosLocales[f.id])
  const hayEnServidor = archivosServidor?.archivos?.every((a) => a.existe)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden lg:gap-6">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] xl:gap-6">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <div className="rounded-[1.5rem] border border-[#F2C4A8]/50 bg-[#FFF6F0] p-4 shadow-sm shadow-[#E97F4A]/10 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Corpus de texto
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Corpus del servidor: <code className="text-xs">humano.txt</code>,{' '}
              <code className="text-xs">copilot.txt</code>, <code className="text-xs">deepseek.txt</code>{' '}
              y <code className="text-xs">chatgpt.txt</code>. También puedes subir tus propios
              archivos .txt.
            </p>

            <ul className="mt-4 grid grid-cols-2 gap-3">
              {FUENTES.map((fuente) => (
                <SlotArchivoCorpus
                  key={fuente.id}
                  fuente={fuente}
                  archivo={archivosLocales[fuente.id]}
                  enServidor={archivosServidor?.archivos?.find((a) => a.fuente === fuente.id)}
                  onArchivo={(file) => asignarArchivo(fuente.id, file)}
                  onQuitar={() => quitarArchivo(fuente.id)}
                />
              ))}
            </ul>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={cargando || !hayArchivosLocales}
                onClick={() => analizar({ usarServidor: false })}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E97F4A] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#E97F4A]/30 transition hover:bg-[#D66B38] disabled:pointer-events-none disabled:opacity-40"
              >
                {cargando ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden />
                )}
                Analizar archivos cargados
              </button>
              <button
                type="button"
                disabled={cargando || !hayEnServidor}
                onClick={() => analizar({ usarServidor: true })}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E97F4A]/40 bg-white px-4 py-3 text-sm font-bold text-[#D66B38] shadow-sm transition hover:border-[#E97F4A] hover:bg-[#FFF6F0] disabled:pointer-events-none disabled:opacity-40"
              >
                <Server className="h-4 w-4" aria-hidden />
                Usar corpus del servidor
              </button>
            </div>
          </div>

          {archivosServidor && (
            <div className="rounded-2xl border border-neutral-100 bg-white p-4 text-xs text-gray-500 shadow-sm">
              <p className="font-semibold text-gray-700">Archivos en servidor</p>
              <ul className="mt-2 space-y-1">
                {archivosServidor.archivos.map((a) => (
                  <li key={a.fuente} className="flex justify-between gap-2">
                    <span>{a.nombre_archivo}</span>
                    <span className={a.existe ? 'text-emerald-600' : 'text-gray-400'}>
                      {a.existe ? `${a.bytes} bytes` : 'No disponible'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-lg:min-h-[18rem] px-1 pt-1 sm:px-2">
          {error && (
            <div
              role="alert"
              className="shrink-0 rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-800"
            >
              {error}
            </div>
          )}

          {!resultado && !cargando && !error && (
            <div className="flex min-h-[14rem] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-[#F9FAFB] p-8 text-center">
              <FileText className="mb-3 h-12 w-12 text-gray-300" aria-hidden />
              <p className="max-w-sm text-sm text-gray-400">
                Sube los textos o usa el corpus del servidor y pulsa analizar para ver las 15
                palabras más frecuentes y la tabla de contingencia.
              </p>
            </div>
          )}

          {cargando && (
            <div className="flex flex-1 items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-[#E97F4A]" aria-hidden />
            </div>
          )}

          {resultado && !cargando && <CarruselResultadosCorpus resultado={resultado} />}
        </div>
      </div>
    </div>
  )
}

function SlotArchivoCorpus({ fuente, archivo, enServidor, onArchivo, onQuitar }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    maxFiles: 1,
    accept: {
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
      'text/rtf': ['.rtf'],
    },
    onDrop: (files) => {
      if (files?.[0]) onArchivo(files[0])
    },
  })

  return (
    <li className="min-w-0 rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold" style={{ color: fuente.color }}>
          {fuente.label}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
          {fuente.archivo}
        </span>
      </div>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-3 py-4 text-center text-xs transition ${
          isDragActive
            ? 'border-[#E97F4A] bg-[#FFF6F0]'
            : 'border-neutral-200 hover:border-[#E97F4A]/50 hover:bg-neutral-50/80'
        }`}
      >
        <input {...getInputProps()} aria-label={`Subir ${fuente.archivo}`} />
        {archivo ? (
          <p className="font-medium text-gray-800">
            {archivo.name}{' '}
            <span className="text-gray-400">({(archivo.size / 1024).toFixed(1)} KB)</span>
          </p>
        ) : (
          <p className="text-gray-500">
            Arrastra <strong>{fuente.archivo}</strong> o haz clic
          </p>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
        <span>
          Servidor:{' '}
          {enServidor?.existe ? (
            <span className="text-emerald-600">disponible</span>
          ) : (
            <span>sin archivo</span>
          )}
        </span>
        {archivo && (
          <button
            type="button"
            onClick={onQuitar}
            className="font-semibold text-red-500 hover:text-red-700"
          >
            Quitar
          </button>
        )}
      </div>
    </li>
  )
}

function CarruselResultadosCorpus({ resultado }) {
  const [indice, setIndice] = useState(0)

  const slides = useMemo(
    () => [
      {
        key: 'top15',
        titulo: 'Top 15 palabras por fuente',
        contenido: <ContenidoTop15 fuentes={resultado.fuentes} />,
      },
      {
        key: 'contingencia',
        titulo: 'Tabla de contingencia',
        icono: Table2,
        contenido: (
          <ContenidoContingencia
            tabla={resultado.tabla_contingencia}
            repetidas={resultado.palabras_repetidas_top15}
            parametros={resultado.parametros}
          />
        ),
      },
      {
        key: 'probabilidad',
        titulo: 'Ejercicios de probabilidad',
        contenido: <ContenidoProbabilidad resultado={resultado} />,
      },
    ],
    [resultado],
  )

  useEffect(() => {
    setIndice(0)
  }, [resultado])

  const total = slides.length
  const slide = slides[indice]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-0.5">
      <TarjetaCorpusCarrusel
        titulo={slide.titulo}
        icono={slide.icono}
        carruselNavegacion={{
          onAnterior: () => setIndice((i) => (i - 1 + total) % total),
          onSiguiente: () => setIndice((i) => (i + 1) % total),
        }}
        carruselPaginacion={{ actual: indice + 1, total }}
      >
        {slide.contenido}
      </TarjetaCorpusCarrusel>
    </div>
  )
}

function TarjetaCorpusCarrusel({
  titulo,
  icono: Icono,
  children,
  carruselNavegacion,
  carruselPaginacion,
}) {
  const tituloCabecera = (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-1">
      {Icono ? <Icono className="h-4 w-4 shrink-0 text-white" strokeWidth={2.25} aria-hidden /> : null}
      <h2 className="!m-0 text-sm font-bold uppercase tracking-wider text-white">{titulo}</h2>
    </div>
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-[1.5rem] border border-neutral-100/90 bg-neutral-50/40 p-1 shadow-sm shadow-neutral-900/[0.06] sm:p-1.5">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-neutral-200/90 bg-white shadow-sm shadow-neutral-900/10">
        <div className="flex shrink-0 items-center bg-[#E97F4A] py-5 sm:py-6">
          <button
            type="button"
            aria-label="Resultado anterior"
            onClick={carruselNavegacion.onAnterior}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-200 ease-out hover:scale-[1.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11 sm:w-11"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />
          </button>
          <div className="min-w-0 flex-1 px-2 sm:px-3">{tituloCabecera}</div>
          <button
            type="button"
            aria-label="Siguiente resultado"
            onClick={carruselNavegacion.onSiguiente}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-200 ease-out hover:scale-[1.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-11 sm:w-11"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">{children}</div>

        {carruselPaginacion?.total > 0 ? (
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

function ContenidoTop15({ fuentes }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {FUENTES.map(({ id, label, color }) => {
        const datos = fuentes?.[id]
        const lista = datos?.top_15 ?? []
        return (
          <div key={id} className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color }}>
              {label}
            </p>
            <p className="mb-2 text-[10px] text-gray-400">
              {formatearNumero(datos?.total_tokens)} tokens ·{' '}
              {formatearNumero(datos?.vocabulario_unico)} únicas
            </p>
            <ol className="space-y-1">
              {lista.length === 0 ? (
                <li className="text-xs text-gray-400">Sin datos</li>
              ) : (
                lista.map((item, i) => (
                  <li key={item.palabra} className="flex justify-between gap-2 text-xs text-gray-800">
                    <span>
                      <span className="mr-1 font-mono text-gray-400">{i + 1}.</span>
                      {item.palabra}
                    </span>
                    <span className="font-semibold tabular-nums text-[#E97F4A]">
                      {item.frecuencia}
                    </span>
                  </li>
                ))
              )}
            </ol>
          </div>
        )
      })}
    </div>
  )
}

function ContenidoContingencia({ tabla, repetidas, parametros }) {
  const columnas = tabla?.columnas ?? []
  const filas = tabla?.filas ?? []
  const totales = tabla?.totales
  const topN = parametros?.top_n ?? 15
  const nFilas = filas.length

  const ejemplo = filas[0]
  const ejPalabra = ejemplo?.palabra ?? 'w'
  const ejFuente = columnas.find((c) => c !== 'total' && c !== 'palabra') ?? 'humano'
  const ejCelda = ejemplo ? Number(ejemplo[ejFuente] ?? 0) : 0
  const ejFila = ejemplo ? Number(ejemplo.total ?? 0) : 0
  const ejCol = totales ? Number(totales[ejFuente] ?? 0) : 0
  const granTotal = Number(totales?.total ?? 0)

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#F2C4A8]/50 bg-[#FFF6F0]/60 px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#D66B38]">
          Cómo se arma la tabla
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-700">
          Se cuentan palabras en cada corpus (Humano y 3 IAs). Las <strong>filas</strong> son la unión
          del top {topN} de cada uno ({nFilas} palabras). Cada <strong>celda</strong> es cuántas veces
          sale esa palabra en ese corpus. Los <strong>totales</strong> suman celdas de la tabla (no todo
          el archivo).
        </p>
        <div className="mt-2 space-y-1.5 [&_.katex]:text-sm">
          <BlockMath math="f(w,\, F_j) = \text{frecuencia de la palabra } w \text{ en la fuente } F_j" />
          <BlockMath
            math={`N_{\\text{tabla}} = \\sum_{w,j} f(w, F_j) = ${granTotal.toLocaleString('es-ES')}`}
          />
        </div>
        {ejemplo && (
          <p className="mt-2 text-[11px] text-gray-600">
            Ejemplo: «{ejPalabra}» en {ETIQUETAS_FUENTE[ejFuente] ?? ejFuente} →{' '}
            <strong>{formatearNumero(ejCelda)}</strong> · total fila {formatearNumero(ejFila)} ·
            total columna {formatearNumero(ejCol)}
          </p>
        )}
      </div>

      {Array.isArray(repetidas) && repetidas.length > 0 && (
        <p className="text-xs text-gray-600">
          <span className="font-semibold text-[#D66B38]">Palabras repetidas en el top {topN}</span> de
          varias fuentes: {repetidas.join(', ')}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-neutral-100">
        <table className="w-full min-w-max border-collapse text-left text-xs">
          <thead className="bg-neutral-50">
            <tr>
              <th className="border-b px-3 py-2.5 font-bold text-gray-900">Palabra</th>
              {columnas
                .filter((c) => c !== 'total')
                .map((col) => (
                  <th key={col} className="border-b px-3 py-2.5 font-bold text-gray-900">
                    {ETIQUETAS_FUENTE[col] ?? col}
                  </th>
                ))}
              <th className="border-b px-3 py-2.5 font-bold text-[#E97F4A]">Total</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.palabra} className="odd:bg-white even:bg-neutral-50/60">
                <td className="border-b border-neutral-100 px-3 py-2 font-medium text-gray-900">
                  {fila.palabra}
                </td>
                {columnas
                  .filter((c) => c !== 'total')
                  .map((col) => (
                    <td
                      key={col}
                      className="border-b border-neutral-100 px-3 py-2 tabular-nums text-gray-700"
                    >
                      {formatearNumero(fila[col])}
                    </td>
                  ))}
                <td className="border-b border-neutral-100 px-3 py-2 font-semibold tabular-nums text-[#E97F4A]">
                  {formatearNumero(fila.total)}
                </td>
              </tr>
            ))}
            {totales && (
              <tr className="bg-[#FFF6F0] font-bold">
                <td className="px-3 py-2.5 text-gray-900">Total</td>
                {columnas
                  .filter((c) => c !== 'total')
                  .map((col) => (
                    <td key={col} className="px-3 py-2.5 tabular-nums text-gray-800">
                      {formatearNumero(totales[col])}
                    </td>
                  ))}
                <td className="px-3 py-2.5 tabular-nums text-[#E97F4A]">
                  {formatearNumero(totales.total)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

