import { useEffect, useMemo, useState } from 'react'
import CampoSelect from './CampoSelect.jsx'
import { ChevronDown } from 'lucide-react'
import { BlockMath } from 'react-katex'
import {
  CATALOGO_BAYES_6,
  FUENTES_IA,
  ID_HUMANO,
  calcularItemCatalogoBayes,
  formatearPct,
  formatearProb,
  listarPalabrasTabla,
  palabraPorDefecto,
  palabrasDefectoCatalogo,
  validarEjercicio2Bayes,
} from './corpusProbabilidad'

const ETIQUETAS = {
  humano: 'Humano',
  copilot: 'Copilot',
  deepseek: 'DeepSeek',
  chatgpt: 'ChatGPT',
}

function texPalabra(p) {
  return `\\text{${String(p || '').replace(/_/g, '\\_')}}`
}

function texEtiqueta(e) {
  return `\\text{${e}}`
}

/** Fórmula LaTeX con sustitución numérica para cada ítem del catálogo. */
function formulaItemCatalogo(item, calc, palabra, herramientaId) {
  const H = texEtiqueta(ETIQUETAS[herramientaId] ?? herramientaId)
  const W = texPalabra(palabra)
  const fin =
    calc.valor !== null && Number.isFinite(Number(calc.valor))
      ? `= ${formatearProb(calc.valor)}`
      : ''

  switch (item.tipo) {
    case 'herramienta_dado_palabra_ia': {
      const num = calc.fPorIa?.[herramientaId] ?? 0
      const den = calc.sumaIA ?? 0
      return `P(${H} \\mid ${W},\\, \\text{IA}) = \\frac{f(${W},\\, ${H})}{\\sum_{\\text{IA}} f(${W})} = \\frac{${num}}{${den}} ${fin}`
    }
    case 'herramienta_dado_palabra_bayes': {
      const b = calc.bayes
      if (!b) return `P(${H} \\mid ${W})`
      return `P(${H} \\mid ${W}) = \\frac{P(${W} \\mid ${H}) \\cdot P(${H})}{P(${W})} = \\frac{${formatearProb(b.pPalabraDadoHerramienta)} \\times ${formatearProb(b.pHerramienta)}}{${formatearProb(b.pPalabra)}} ${fin}`
    }
    case 'humano_dado_palabra':
      return `P(\\text{Humano} \\mid ${W}) = \\frac{f(${W},\\, \\text{Humano})}{N_{\\text{fila}(${W})}} = \\frac{${calc.numerador ?? 0}}{${calc.denominador ?? 0}} ${fin}`
    case 'ia_dado_palabra':
      return `P(\\text{IA} \\mid ${W}) = \\frac{\\sum_{\\text{IA}} f(${W})}{N_{\\text{fila}(${W})}} = \\frac{${calc.numerador ?? 0}}{${calc.denominador ?? 0}} ${fin}`
    case 'palabra_dado_fuente':
      return `P(${W} \\mid ${H}) = \\frac{f(${W},\\, ${H})}{N_{${H}}} = \\frac{${calc.numerador ?? 0}}{${calc.denominador ?? 0}} ${fin}`
    default:
      return ''
  }
}

export function ValidacionRamasSuman1({ titulo, nota, ramas, todasOk, expandidoInicial = false }) {
  const [expandido, setExpandido] = useState(expandidoInicial)

  return (
    <div
      className={`mx-2 mt-3 rounded-xl border ${
        todasOk
          ? 'border-emerald-200/90 bg-emerald-50/70'
          : 'border-amber-200/90 bg-amber-50/70'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        aria-expanded={expandido}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold text-gray-800">{titulo}</span>
          {!expandido && todasOk && (
            <span className="mt-0.5 block text-[9px] font-medium text-emerald-800">
              Todas las ramas ∑ = 100 %
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-gray-500">
          {expandido ? 'Contraer' : 'Expandir'}
          <ChevronDown
            className={`h-3.5 w-3.5 text-[#E97F4A] transition-transform ${expandido ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </span>
      </button>

      {expandido && (
        <div className="border-t border-white/60 px-3 pb-2.5 pt-2">
          {nota ? <p className="text-[9px] leading-snug text-gray-600">{nota}</p> : null}
          <ul className={`space-y-1 ${nota ? 'mt-2' : ''}`}>
            {ramas.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-gray-700">{r.etiqueta}</span>
                <span
                  className={`shrink-0 font-mono font-semibold tabular-nums ${
                    r.validacion?.ok ? 'text-emerald-800' : 'text-amber-900'
                  }`}
                >
                  {r.validacion?.ok ? '∑ = 100 % ✓' : `∑ = ${formatearPct(r.validacion?.suma ?? 0)}`}
                </span>
              </li>
            ))}
          </ul>
          {todasOk ? (
            <p className="mt-2">
              <BadgeValidacionEstocastica validacion={{ ok: true, suma: 1 }} />
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function BadgeValidacionEstocastica({ validacion }) {
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

function ItemCatalogoBayes({
  item,
  idx,
  resultado,
  palabra,
  herramientaId,
  palabras,
  onPalabra,
  onHerramienta,
  expandidoInicial = false,
}) {
  const [expandido, setExpandido] = useState(expandidoInicial)

  const calc = useMemo(
    () => calcularItemCatalogoBayes(resultado, item.tipo, palabra, herramientaId),
    [resultado, item.tipo, palabra, herramientaId],
  )

  const mathFormula = useMemo(
    () => (calc.valor !== null ? formulaItemCatalogo(item, calc, palabra, herramientaId) : ''),
    [item, calc, palabra, herramientaId],
  )

  const validacion = useMemo(() => {
    if (item.tipo === 'herramienta_dado_palabra_ia') {
      return validarEjercicio2Bayes(resultado, palabra, 'ia').modoIA
    }
    if (item.tipo === 'herramienta_dado_palabra_bayes') {
      return validarEjercicio2Bayes(resultado, palabra, 'global').modoGlobal
    }
    if (item.tipo === 'humano_dado_palabra' || item.tipo === 'ia_dado_palabra') {
      return validarEjercicio2Bayes(resultado, palabra, 'global').origenDadoPalabra
    }
    return { ok: calc.valor !== null, suma: 1 }
  }, [resultado, palabra, item.tipo, calc.valor])

  const etiquetaH = ETIQUETAS[herramientaId] ?? herramientaId
  const fuenteOpciones =
    item.tipo === 'palabra_dado_fuente'
      ? [
          { value: ID_HUMANO, label: ETIQUETAS[ID_HUMANO] },
          ...FUENTES_IA.map((id) => ({ value: id, label: ETIQUETAS[id] })),
        ]
      : FUENTES_IA.map((id) => ({ value: id, label: ETIQUETAS[id] }))

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50/80"
        aria-expanded={expandido}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-gray-800">
            {idx + 1}. {item.titulo}
          </span>
          {!expandido && calc.valor !== null && (
            <span className="mt-0.5 block text-sm font-bold text-[#E97F4A]">{formatearPct(calc.valor)}</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-gray-500">
          {expandido ? 'Contraer' : 'Expandir'}
          <ChevronDown
            className={`h-4 w-4 text-[#E97F4A] transition-transform ${expandido ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </span>
      </button>

      {expandido && (
        <div className="border-t border-neutral-100 px-4 pb-4 pt-3">
          <p className="mb-3 text-[11px] text-gray-500">{item.descripcion}</p>

          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <CampoSelect
              id={`ej2-cat-${item.id}-palabra`}
              label="Palabra"
              value={palabra}
              onChange={onPalabra}
              opciones={palabras.map((p) => ({ value: p, label: p }))}
            />
            {item.requiereHerramienta || item.tipo === 'palabra_dado_fuente' ? (
              <CampoSelect
                id={`ej2-cat-${item.id}-fuente`}
                label={item.tipo === 'palabra_dado_fuente' ? 'Fuente (F1–F4)' : 'Herramienta IA'}
                value={herramientaId}
                onChange={onHerramienta}
                opciones={fuenteOpciones}
              />
            ) : (
              <div className="flex items-end pb-1 text-[11px] text-gray-400">—</div>
            )}
          </div>

          <p className="mb-2 text-sm leading-relaxed text-gray-700">
            {item.tipo === 'herramienta_dado_palabra_ia' && (
              <>
                Supón que la palabra «<strong className="text-[#D66B38]">{palabra}</strong>»{' '}
                <strong>ya sabemos</strong> que fue escrita por una IA (no por el libro). ¿Qué
                probabilidad hay de que fuera <strong>{etiquetaH}</strong>?
              </>
            )}
            {item.tipo === 'herramienta_dado_palabra_bayes' && (
              <>
                En el corpus analizado aparece la palabra «
                <strong className="text-[#D66B38]">{palabra}</strong>», pero{' '}
                <strong>no sabemos</strong> quién la escribió. ¿Cuál es la probabilidad de que la
                autoría sea <strong>{etiquetaH}</strong> (frente a Humano, Copilot, DeepSeek y
                ChatGPT)?
              </>
            )}
            {item.tipo === 'humano_dado_palabra' && (
              <>
                Aparece la palabra «<strong className="text-[#D66B38]">{palabra}</strong>». ¿Cuál es
                la probabilidad de que provenga del <strong>corpus humano</strong> (libro)?
              </>
            )}
            {item.tipo === 'ia_dado_palabra' && (
              <>
                Aparece la palabra «<strong className="text-[#D66B38]">{palabra}</strong>». ¿Cuál es
                la probabilidad de que provenga de <strong>alguna IA</strong> (las tres herramientas
                juntas)?
              </>
            )}
            {item.tipo === 'palabra_dado_fuente' && (
              <>
                Si tomamos textos solo de <strong>{etiquetaH}</strong>, ¿cuál es la probabilidad de
                encontrar la palabra «<strong className="text-[#D66B38]">{palabra}</strong>»?
              </>
            )}
          </p>

          {mathFormula ? (
            <div className="mb-3 rounded-lg border border-neutral-100 bg-neutral-50/90 px-2 py-2 [&_.katex]:text-sm">
              <BlockMath math={mathFormula} />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {calc.valor !== null ? (
              <p className="text-base font-bold text-[#E97F4A]">{formatearPct(calc.valor)}</p>
            ) : (
              <p className="text-sm text-gray-400">Sin dato en la tabla</p>
            )}
            {calc.valor !== null && <BadgeValidacionEstocastica validacion={validacion} />}
          </div>
        </div>
      )}
    </div>
  )

}

export default function CatalogoBayes6({ resultado }) {
  const palabras = useMemo(() => listarPalabrasTabla(resultado.tabla_contingencia), [resultado])

  const [params, setParams] = useState(() =>
    CATALOGO_BAYES_6.map((item, i) => ({
      palabra: '',
      herramienta: item.herramientaDefecto ?? item.fuenteDefecto ?? FUENTES_IA[0],
      idx: i,
    })),
  )

  useEffect(() => {
    const defs = palabrasDefectoCatalogo(resultado)
    setParams(
      CATALOGO_BAYES_6.map((item, i) => ({
        palabra: defs[i] ?? palabraPorDefecto(resultado),
        herramienta: item.herramientaDefecto ?? item.fuenteDefecto ?? FUENTES_IA[0],
        idx: i,
      })),
    )
  }, [resultado])

  const actualizar = (idx, campo, valor) => {
    setParams((prev) => prev.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p)))
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#D66B38]">
        Catálogo de 6 probabilidades condicionales
      </p>
      {CATALOGO_BAYES_6.map((item, idx) => (
        <ItemCatalogoBayes
          key={item.id}
          item={item}
          idx={idx}
          resultado={resultado}
          palabra={params[idx]?.palabra ?? ''}
          herramientaId={params[idx]?.herramienta ?? FUENTES_IA[0]}
          palabras={palabras}
          onPalabra={(v) => actualizar(idx, 'palabra', v)}
          onHerramienta={(v) => actualizar(idx, 'herramienta', v)}
          expandidoInicial={idx === 0}
        />
      ))}
    </div>
  )
}
