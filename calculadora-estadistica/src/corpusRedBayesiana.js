/**
 * Red bayesiana F1–F4 → A/Ā → IA/H (diagrama del docente).
 * Probabilidades desde la tabla de contingencia.
 */
import {
  FUENTES_IA,
  ID_HUMANO,
  extraerTotalesTablaContingencia,
  filaPalabra,
  formatearProb,
  freqPalabraEnFuente,
  probabilidadesOrigenDadoPalabra,
  validarSumaProbabilidades,
} from './corpusProbabilidad'

export const FUENTES_RED = [
  { id: ID_HUMANO, f: 'F1', nombre: 'Humano (libro)' },
  { id: 'copilot', f: 'F2', nombre: 'Copilot' },
  { id: 'deepseek', f: 'F3', nombre: 'DeepSeek' },
  { id: 'chatgpt', f: 'F4', nombre: 'ChatGPT' },
]

/** Construye CPTs y probabilidades para la red y para derivar Markov. */
export function construirRedBayesiana(resultado, palabra) {
  const tabla = resultado?.tabla_contingencia
  const marg = extraerTotalesTablaContingencia(tabla)
  const fila = filaPalabra(tabla, palabra)
  const origen = probabilidadesOrigenDadoPalabra(resultado, palabra)

  const pFi = {}
  const pADadoFi = {}
  const pAbarDadoFi = {}

  for (const { id } of FUENTES_RED) {
    pFi[id] = marg.totalGeneral > 0 ? (marg.porFuente[id] ?? 0) / marg.totalGeneral : null
    const nCol = marg.porFuente[id] ?? 0
    const f = freqPalabraEnFuente(fila, id)
    pADadoFi[id] = nCol > 0 ? f / nCol : null
    pAbarDadoFi[id] =
      pADadoFi[id] !== null ? Math.max(0, Math.min(1, 1 - pADadoFi[id])) : null
  }

  const pIADadoA = origen.sumaFila > 0
    ? FUENTES_IA.reduce((s, id) => s + freqPalabraEnFuente(fila, id), 0) / origen.sumaFila
    : null
  const pHDadoA = origen.sumaFila > 0 ? freqPalabraEnFuente(fila, ID_HUMANO) / origen.sumaFila : null

  const pIADadoAbar = marg.totalGeneral > 0 ? marg.totalIA / marg.totalGeneral : null
  const pHDadoAbar = marg.totalGeneral > 0 ? marg.totalHumano / marg.totalGeneral : null

  return {
    palabra,
    pFi,
    pADadoFi,
    pAbarDadoFi,
    pIADadoA,
    pHDadoA,
    pIADadoAbar,
    pHDadoAbar,
    origen,
    marg,
    fila,
  }
}

/** Cada rama del árbol de decisión debe sumar probabilidad 1. */
export function validarArbolDecision(marg) {
  const pHumano = marg.totalGeneral > 0 ? marg.totalHumano / marg.totalGeneral : 0
  const pIA = marg.totalGeneral > 0 ? marg.totalIA / marg.totalGeneral : 0
  const pCop = marg.totalIA > 0 ? (marg.porFuente.copilot ?? 0) / marg.totalIA : 0
  const pDeep = marg.totalIA > 0 ? (marg.porFuente.deepseek ?? 0) / marg.totalIA : 0
  const pGpt = marg.totalIA > 0 ? (marg.porFuente.chatgpt ?? 0) / marg.totalIA : 0

  const ramas = [
    {
      id: 'autor',
      etiqueta: 'Desde Autor → Humano + IA',
      validacion: validarSumaProbabilidades([pHumano, pIA]),
    },
    {
      id: 'ia-tools',
      etiqueta: 'Dado IA → Copilot + DeepSeek + ChatGPT',
      validacion: validarSumaProbabilidades([pCop, pDeep, pGpt]),
    },
    {
      id: 'humano-rama',
      etiqueta: 'Dado Humano → rama al libro (100 %)',
      validacion: validarSumaProbabilidades([1]),
    },
  ]

  return {
    ramas,
    todasOk: ramas.every((r) => r.validacion.ok),
  }
}

/** Cada nodo con hijos en la red bayesiana: las probabilidades salientes suman 1. */
export function validarRedBayesiana(red) {
  const ramas = [
    {
      id: 'fuentes',
      etiqueta: 'Fuentes F1 + F2 + F3 + F4',
      validacion: validarSumaProbabilidades(FUENTES_RED.map((f) => red.pFi[f.id])),
    },
    ...FUENTES_RED.map((f) => ({
      id: `a-${f.id}`,
      etiqueta: `Dado ${f.f}: P(A) + P(Ā)`,
      validacion: validarSumaProbabilidades([red.pADadoFi[f.id], red.pAbarDadoFi[f.id]]),
    })),
    {
      id: 'estilo-a',
      etiqueta: 'Dado A (palabra): P(IA) + P(H)',
      validacion: validarSumaProbabilidades([red.pIADadoA, red.pHDadoA]),
    },
    {
      id: 'estilo-abar',
      etiqueta: 'Dado Ā (no palabra): P(IA) + P(H)',
      validacion: validarSumaProbabilidades([red.pIADadoAbar, red.pHDadoAbar]),
    },
  ]

  return {
    ramas,
    todasOk: ramas.every((r) => r.validacion.ok),
  }
}

/**
 * Matriz de transición 3×3 entre herramientas IA derivada de P(Fj|Fi) vía la red:
 * peso de transición i→j proporcional a P(Fj)·P(A|Fj) normalizado por fila.
 */
export function markov3IAsDesdeRed(red) {
  const ids = FUENTES_IA
  const matriz = []
  for (const desde of ids) {
    const fila = []
    let suma = 0
    for (const hacia of ids) {
      const pF = red.pFi[hacia] ?? 0
      const pA = red.pADadoFi[hacia] ?? 0
      const w = pF * pA
      fila.push(w)
      suma += w
    }
    if (suma > 0) {
      for (let j = 0; j < fila.length; j++) fila[j] /= suma
    } else {
      for (let j = 0; j < fila.length; j++) fila[j] = 1 / ids.length
    }
    matriz.push(fila)
  }

  const pi = ids.map((id) => red.pFi[id] ?? 0)
  const sumPi = pi.reduce((a, b) => a + b, 0)
  const pInicial = {}
  ids.forEach((id, i) => {
    pInicial[id] = sumPi > 0 ? pi[i] / sumPi : 1 / ids.length
  })

  return {
    estados: ids.map((id) => FUENTES_RED.find((f) => f.id === id)?.nombre ?? id),
    ids,
    matriz,
    pInicial,
  }
}

/** Valida π y filas de Markov 3×3 (IAs). */
export function validarMarkov3IA(markov) {
  const distribucionInicial = validarSumaProbabilidades(markov.ids.map((id) => markov.pInicial[id]))
  const filas = markov.matriz.map((fila) => validarSumaProbabilidades(fila))
  return {
    distribucionInicial,
    filas,
    todasOk: distribucionInicial.ok && filas.every((f) => f.ok),
  }
}

function texPalabraMarkov(p) {
  return `\\text{${String(p || '').replace(/_/g, '\\_')}}`
}

/** π(fila) × matriz: una fila por cada columna de la matriz. */
export function filaPorMatriz(fila, matriz) {
  const cols = matriz[0]?.length ?? 0
  const out = []
  for (let j = 0; j < cols; j++) {
    let s = 0
    for (let i = 0; i < fila.length; i++) {
      s += (fila[i] ?? 0) * (matriz[i]?.[j] ?? 0)
    }
    out.push(s)
  }
  return out
}

/** Fórmula LaTeX: cada componente del vector resultado = suma de πᵢ·Pᵢⱼ. */
function desgloseVectorPorMatriz(fila, matriz, resultado, etiquetasCol) {
  return etiquetasCol.map((col, j) => {
    const terminos = fila
      .map((v, i) => `${formatearProb(v)}\\cdot${formatearProb(matriz[i][j])}`)
      .join(' + ')
    return `\\pi_{${col}} = ${terminos} = ${formatearProb(resultado[j])}`
  })
}

/** Vector fila en LaTeX: π^(t) = [v1, v2, …] */
export function vectorPiLaTeX(nivel, valores, etiquetas = null) {
  const v = valores.map((x) => formatearProb(x)).join(',\\; ')
  if (etiquetas?.length === valores.length) {
    const conEt = etiquetas.map((e, i) => `${e}=${formatearProb(valores[i])}`).join(',\\; ')
    return `\\pi^{(${nivel})} = [${conEt}]`
  }
  return `\\pi^{(${nivel})} = [${v}]`
}

const DEC_PIZARRA = 4

function probPizarra(p) {
  return formatearProb(p, DEC_PIZARRA)
}

/** Vector fila [v1, v2, …] como en la pizarra. */
export function vectorFilaLaTeX(valores) {
  return `\\bigl[${valores.map((x) => probPizarra(x)).join(',\\; ')}\\bigr]`
}

/** Matriz en forma bmatrix (filas con \\\\). */
export function matrizBmatrixLaTeX(matriz) {
  const rows = matriz
    .map((fila) => fila.map((x) => probPizarra(x)).join(' & '))
    .join(' \\\\ ')
  return `\\begin{bmatrix}${rows}\\end{bmatrix}`
}

/**
 * Bloques LaTeX del procedimiento en orden de pizarra:
 * π(0) → P₁ → π(1)=π(0)·P₁ → P₂ → π(2)=π(1)·P₂
 */
export function procedimientoMarkovPizarra({ pi0, pi1, pi2, P1, P2 }) {
  const v0 = vectorFilaLaTeX(pi0)
  const v1 = vectorFilaLaTeX(pi1)
  const v2 = vectorFilaLaTeX(pi2)
  const m1 = matrizBmatrixLaTeX(P1)
  const m2 = matrizBmatrixLaTeX(P2)

  return [
    {
      id: 'pi0',
      etiqueta: 'Estado inicial',
      math: `\\pi^{(0)} = ${v0}`,
    },
    {
      id: 'p1',
      etiqueta: 'Matriz de transición P₁ (4×2)',
      math: `P_1 = ${m1}`,
      nota: 'Filas: F1, F2, F3, F4 (A, B, C, D en el diagrama). Columnas: A, Ā.',
    },
    {
      id: 'pi1',
      etiqueta: 'Primer paso',
      math: `\\begin{aligned}
\\pi^{(1)} &= \\pi^{(0)} \\cdot P_1 \\\\
&= ${v0} \\cdot ${m1} \\\\
&= ${v1}
\\end{aligned}`,
    },
    {
      id: 'p2',
      etiqueta: 'Matriz de transición P₂ (2×2)',
      math: `P_2 = ${m2}`,
      nota: 'Filas: A, Ā. Columnas: I (IA), H (Humano).',
    },
    {
      id: 'pi2',
      etiqueta: 'Resultado final',
      math: `\\begin{aligned}
\\pi^{(2)} &= \\pi^{(1)} \\cdot P_2 \\\\
&= ${v1} \\cdot ${m2} \\\\
&= ${v2}
\\end{aligned}`,
    },
  ]
}

/**
 * Cadena de Markov por capas (como en clase / pizarra):
 * π(0) sobre F1–F4 → P1 (4×2) → π(1) = π(0)·P1 sobre {A, Ā} → P2 (2×2) → π(2) = π(1)·P2 sobre {IA, H}.
 */
export function cadenaMarkovCapasDesdeRed(red) {
  const palabra = red.palabra ?? ''

  const filasP1 = FUENTES_RED.map((f) => f.f)
  const colsP1 = ['A', '\\bar{A}']
  const pi0 = FUENTES_RED.map((f) => red.pFi[f.id] ?? 0)

  const P1 = FUENTES_RED.map((f) => [
    red.pADadoFi[f.id] ?? 0,
    red.pAbarDadoFi[f.id] ?? 0,
  ])

  const pi1 = filaPorMatriz(pi0, P1)

  const filasP2 = ['A', '\\bar{A}']
  const colsP2 = ['IA', 'H']
  const P2 = [
    [red.pIADadoA ?? 0, red.pHDadoA ?? 0],
    [red.pIADadoAbar ?? 0, red.pHDadoAbar ?? 0],
  ]

  const pi2 = filaPorMatriz(pi1, P2)

  const vecStr = (v) => v.map((x) => formatearProb(x)).join(',\\; ')
  const etiquetasPi0 = FUENTES_RED.map((f) => f.f)
  const etiquetasPi1 = ['A', '\\bar{A}']
  const etiquetasPi2 = ['IA', 'H']

  const desglosePi1 = desgloseVectorPorMatriz(pi0, P1, pi1, etiquetasPi1)
  const desglosePi2 = desgloseVectorPorMatriz(pi1, P2, pi2, etiquetasPi2)

  const procedimientoPizarra = procedimientoMarkovPizarra({ pi0, pi1, pi2, P1, P2 })

  const pasos = [
    {
      titulo: 'Capa π(0) — fuentes F1–F4',
      texto: 'Distribución inicial: probabilidad de elegir cada fuente en la tabla.',
      formulas: [
        `\\pi^{(0)} = [${FUENTES_RED.map((f) => `P(${f.f})`).join(',\\; ')}] = [${vecStr(pi0)}]`,
      ],
    },
    {
      titulo: 'Matriz P₁ (4×2): de fuente → {A, Ā}',
      texto: `Cada fila: P(A|F_j) y P(Ā|F_j) para la palabra ${palabra}. Cada fila suma 1.`,
      formulas: FUENTES_RED.map(
        (f, i) =>
          `P(A|${f.f})=${formatearProb(P1[i][0])},\\; P(\\bar{A}|${f.f})=${formatearProb(P1[i][1])}`,
      ),
    },
    {
      titulo: 'Capa π(1) = π(0) · P₁',
      texto:
        'El vector π(0) (fila) se multiplica por P₁; el resultado es otro vector π(1) con 2 probabilidades (A y Ā).',
      formulas: [
        `${vectorPiLaTeX(0, pi0)}`,
        `\\pi^{(1)} = \\pi^{(0)} \\cdot P_1 = [${vecStr(pi1)}]`,
        ...desglosePi1,
      ],
    },
    {
      titulo: 'Matriz P₂ (2×2): de {A, Ā} → {IA, H}',
      texto: 'Fila A: P(IA|A), P(H|A). Fila Ā: P(IA|Ā), P(H|Ā).',
      formulas: [
        `P(IA|A)=${formatearProb(P2[0][0])},\\; P(H|A)=${formatearProb(P2[0][1])}`,
        `P(IA|\\bar{A})=${formatearProb(P2[1][0])},\\; P(H|\\bar{A})=${formatearProb(P2[1][1])}`,
      ],
    },
    {
      titulo: 'Capa π(2) = π(1) · P₂ — resultado final',
      texto:
        'π(2) es el vector resultado de toda la cadena: probabilidad marginal de IA y de Humano (H).',
      formulas: [
        `${vectorPiLaTeX(1, pi1)}`,
        `\\pi^{(2)} = \\pi^{(1)} \\cdot P_2 = [${vecStr(pi2)}]`,
        ...desglosePi2,
        `P(IA) = ${formatearProb(pi2[0])},\\quad P(H) = ${formatearProb(pi2[1])}`,
      ],
    },
    {
      titulo: 'Regla',
      texto:
        'Cada π es un vector de probabilidad: sus componentes suman 1. Al multiplicar π × P obtienes el vector del siguiente paso.',
    },
  ]

  const validacion = {
    pi0: validarSumaProbabilidades(pi0),
    pi1: validarSumaProbabilidades(pi1),
    pi2: validarSumaProbabilidades(pi2),
    filasP1: P1.map((fila) => validarSumaProbabilidades(fila)),
    filasP2: P2.map((fila) => validarSumaProbabilidades(fila)),
    todasOk:
      validarSumaProbabilidades(pi0).ok &&
      validarSumaProbabilidades(pi1).ok &&
      validarSumaProbabilidades(pi2).ok &&
      P1.every((f) => validarSumaProbabilidades(f).ok) &&
      P2.every((f) => validarSumaProbabilidades(f).ok),
  }

  return {
    palabra,
    pi0,
    pi1,
    pi2,
    P1,
    P2,
    filasP1,
    colsP1,
    filasP2,
    colsP2,
    etiquetasPi0,
    etiquetasPi1,
    etiquetasPi2,
    etiquetasFuentes: FUENTES_RED.map((f) => `${f.f} (${f.nombre})`),
    desglosePi1,
    desglosePi2,
    procedimientoPizarra,
    pasos,
    validacion,
    resultadoFinal: {
      pIA: pi2[0],
      pH: pi2[1],
    },
  }
}

/** Pasos para mostrar construcción de la matriz 3×3 (IAs). */
export function pasosMarkov3DesdeRed(red) {
  const palabra = red.palabra ?? ''
  const W = texPalabraMarkov(palabra)
  const pesos = FUENTES_IA.map((id) => {
    const meta = FUENTES_RED.find((f) => f.id === id)
    const pF = red.pFi[id] ?? 0
    const pA = red.pADadoFi[id] ?? 0
    return {
      id,
      f: meta?.f ?? id,
      nombre: meta?.nombre ?? id,
      pF,
      pA,
      w: pF * pA,
    }
  })
  const sumaW = pesos.reduce((s, p) => s + p.w, 0)
  const filaT = sumaW > 0 ? pesos.map((p) => p.w / sumaW) : pesos.map(() => 1 / pesos.length)
  const sumPi = FUENTES_IA.reduce((s, id) => s + (red.pFi[id] ?? 0), 0)

  const pasos = [
    {
      titulo: 'Datos de la red bayesiana',
      texto: `Evento A: la palabra ${palabra} aparece en la fuente. Usamos P(Fj) y P(A|Fj) de la tabla.`,
    },
    {
      titulo: 'Peso por herramienta IA',
      texto: 'Para cada Fj: peso w_j = P(Fj) × P(A|Fj).',
      formulas: pesos.map(
        (p) => `w_{${p.f}} = ${formatearProb(p.pF)} \\times ${formatearProb(p.pA)} = ${formatearProb(p.w)}`,
      ),
    },
    {
      titulo: 'Normalizar cada fila de la matriz',
      texto: `T_{i\\rightarrow j} = w_j / \\sum_k w_k. Suma de pesos = ${formatearProb(sumaW)}.`,
      formulas:
        sumaW > 0
          ? pesos.map(
              (p, j) =>
                `T_{\\rightarrow ${p.nombre}} = \\frac{${formatearProb(p.w)}}{${formatearProb(sumaW)}} = ${formatearProb(filaT[j])}`,
            )
          : [],
    },
    {
      titulo: 'Distribución inicial π',
      texto: 'Peso de cada IA en el corpus (entre las tres).',
      formulas: FUENTES_IA.map((id) => {
        const meta = FUENTES_RED.find((f) => f.id === id)
        const pi = sumPi > 0 ? (red.pFi[id] ?? 0) / sumPi : 1 / FUENTES_IA.length
        return `\\pi(${meta?.f}) = \\frac{${formatearProb(red.pFi[id])}}{${formatearProb(sumPi)}} = ${formatearProb(pi)}`
      }),
    },
    {
      titulo: 'Regla Markov',
      texto: 'Cada fila de la matriz debe sumar 1 (100 %). La app valida ∑ P = 1.00.',
    },
  ]

  return { pasos, pesos, sumaW, filaT }
}

/** Pasos para la matriz 2×2 Humano ↔ IA. */
export function pasosMarkov2DesdeRed(red) {
  const palabra = red.palabra ?? ''
  const W = texPalabraMarkov(palabra)
  const pH = red.pHDadoA ?? 0
  const pIA = red.pIADadoA ?? 0
  const filaH = red.fila
  const nHum = freqPalabraEnFuente(filaH, ID_HUMANO)
  const nIA = FUENTES_IA.reduce((s, id) => s + freqPalabraEnFuente(filaH, id), 0)
  const nFila = Number(filaH?.total ?? 0)

  const pasos = [
    {
      titulo: 'Probabilidades de la red (dado A)',
      texto: `Palabra ${palabra}, fila de la tabla (total ${nFila}):`,
      formulas: [
        `P(H \\mid ${W}) = \\frac{${nHum}}{${nFila}} = ${formatearProb(pH)}`,
        `P(IA \\mid ${W}) = \\frac{${nIA}}{${nFila}} = ${formatearProb(pIA)}`,
      ],
    },
    {
      titulo: 'Fila Humano (estado actual = Humano)',
      texto: 'Quedarse en Humano o pasar a IA.',
      formulas: [
        `P(H \\rightarrow H) = 1 - P(IA \\mid ${W}) = ${formatearProb(1 - pIA)}`,
        `P(H \\rightarrow IA) = ${formatearProb(pIA)}`,
      ],
    },
    {
      titulo: 'Fila IA (estado actual = IA)',
      texto: 'Quedarse en IA o pasar a Humano.',
      formulas: [
        `P(IA \\rightarrow IA) = 1 - P(H \\mid ${W}) = ${formatearProb(1 - pH)}`,
        `P(IA \\rightarrow H) = ${formatearProb(pH)}`,
      ],
    },
    {
      titulo: 'Regla Markov',
      texto: `Suma fila Humano: ${formatearProb((1 - pIA) + pIA)}. Suma fila IA: ${formatearProb(pH + (1 - pH))}. Debe ser 1 en ambas.`,
    },
  ]

  return { pasos, pH, pIA }
}

/** Markov 2×2 Humano ↔ IA desde capa IA/H de la red (dado palabra A). */
export function markov2HumanoIADesdeRed(red) {
  const pH = red.pHDadoA ?? red.pFi[ID_HUMANO]
  const pIA = red.pIADadoA ?? (red.marg.totalIA / (red.marg.totalGeneral || 1))
  const pHtoIA = pIA
  const pIAtoH = pH
  return {
    estados: ['Humano', 'IA'],
    matriz: [
      [1 - pHtoIA, pHtoIA],
      [pIAtoH, 1 - pIAtoH],
    ],
    pInicial: { Humano: pH, IA: pIA },
    derivadoDe: 'P(H|A) y P(IA|A) en la red bayesiana',
  }
}
