/** Cálculos de probabilidad a partir del resultado de /api/corpus/analizar */

export const FUENTES_IA = ['copilot', 'deepseek', 'chatgpt']
export const ID_HUMANO = 'humano'

/** Tolerancia numérica para considerar que una suma es 1 (100 %). */
export const TOLERANCIA_SUMA = 1e-4

export function formatearProb(p, decimales = 6) {
  const x = Number(p)
  if (!Number.isFinite(x)) return '—'
  if (x === 0) return '0'
  if (x === 1) return '1'
  return x.toFixed(decimales)
}

export function formatearPct(p, decimales = 2) {
  const x = Number(p)
  if (!Number.isFinite(x)) return '—'
  return `${(x * 100).toFixed(decimales)} %`
}

/** Totales de tokens por fuente (corpus completo; no usar en ejercicios de probabilidad). */
export function extraerTotalesCorpus(resultado) {
  const fuentes = resultado?.fuentes ?? {}
  const porFuente = {}
  let totalGeneral = 0
  for (const id of [ID_HUMANO, ...FUENTES_IA]) {
    const n = Number(fuentes[id]?.total_tokens ?? 0)
    porFuente[id] = n
    totalGeneral += n
  }
  const totalIA = FUENTES_IA.reduce((s, id) => s + (porFuente[id] ?? 0), 0)
  return { porFuente, totalGeneral, totalIA, totalHumano: porFuente[ID_HUMANO] ?? 0 }
}

/** Totales por columna de la tabla de contingencia (denominadores de los ejercicios). */
export function extraerTotalesTablaContingencia(tabla) {
  const totales = tabla?.totales ?? {}
  const porFuente = {}
  for (const id of [ID_HUMANO, ...FUENTES_IA]) {
    porFuente[id] = Number(totales[id] ?? 0)
  }
  const totalHumano = porFuente[ID_HUMANO] ?? 0
  const totalIA = FUENTES_IA.reduce((s, id) => s + (porFuente[id] ?? 0), 0)
  const totalGeneral =
    Number(totales.total ?? 0) > 0
      ? Number(totales.total)
      : totalHumano + totalIA
  return { porFuente, totalGeneral, totalIA, totalHumano, totales }
}

export function totalColumnaTabla(tabla, fuenteId) {
  return extraerTotalesTablaContingencia(tabla).porFuente[fuenteId] ?? 0
}

export function listarPalabrasTabla(tabla) {
  return (tabla?.filas ?? []).map((f) => String(f.palabra))
}

export function filaPalabra(tabla, palabra) {
  return (tabla?.filas ?? []).find((f) => f.palabra === palabra) ?? null
}

export function freqPalabraEnFuente(fila, fuenteId) {
  if (!fila) return 0
  return Number(fila[fuenteId] ?? 0)
}

/** P(palabra | fuente) = f(palabra, fuente) / N_columna (lectura directa de la tabla). */
export function probabilidadCondicionalPalabraIA(resultado, palabra, iaId) {
  const tabla = resultado?.tabla_contingencia
  const { porFuente } = extraerTotalesTablaContingencia(tabla)
  const fila = filaPalabra(tabla, palabra)
  const numerador = freqPalabraEnFuente(fila, iaId)
  const denominador = porFuente[iaId] ?? 0
  if (denominador <= 0) return { valor: null, numerador, denominador }
  return { valor: numerador / denominador, numerador, denominador }
}

/** P(IA) y P(herramienta) con totales de columnas de la tabla de contingencia. */
export function probabilidadesMarginales(resultado) {
  const { porFuente, totalGeneral, totalIA, totalHumano } = extraerTotalesTablaContingencia(
    resultado?.tabla_contingencia,
  )
  const pIA = totalGeneral > 0 ? totalIA / totalGeneral : null
  const pHumano = totalGeneral > 0 ? totalHumano / totalGeneral : null
  const pHerramienta = {}
  for (const id of FUENTES_IA) {
    pHerramienta[id] = totalGeneral > 0 ? (porFuente[id] ?? 0) / totalGeneral : null
  }
  return { pIA, pHumano, pHerramienta, porFuente, totalGeneral, totalIA, totalHumano }
}

/** Ejercicio 2: P(herramienta | palabra) = P(palabra|herramienta)·P(herramienta) / P(palabra) */
export function bayesHerramientaDadoPalabra(resultado, palabra, herramientaId) {
  const tabla = resultado?.tabla_contingencia
  const { porFuente, totalGeneral } = extraerTotalesTablaContingencia(tabla)
  const fila = filaPalabra(tabla, palabra)
  const fPalabra = freqPalabraEnFuente(fila, herramientaId)
  const totalHerramienta = porFuente[herramientaId] ?? 0

  const pPalabraDadoHerramienta = totalHerramienta > 0 ? fPalabra / totalHerramienta : null
  const pHerramienta = totalGeneral > 0 ? totalHerramienta / totalGeneral : null

  const fPalabraTotal = fila ? Number(fila.total ?? 0) : 0
  const pPalabra = totalGeneral > 0 ? fPalabraTotal / totalGeneral : null

  let valor = null
  if (
    pPalabraDadoHerramienta !== null &&
    pHerramienta !== null &&
    pPalabra !== null &&
    pPalabra > 0
  ) {
    valor = (pPalabraDadoHerramienta * pHerramienta) / pPalabra
  }

  return {
    valor,
    pPalabraDadoHerramienta,
    pHerramienta,
    pPalabra,
    fPalabra,
    totalHerramienta,
    fPalabraTotal,
    totalGeneral,
  }
}

/** P(herramienta | palabra y origen IA): renormaliza solo entre herramientas IA. */
export function bayesHerramientaDadoPalabraYIA(resultado, palabra, herramientaId) {
  const fila = filaPalabra(resultado.tabla_contingencia, palabra)
  if (!fila) return { valor: null }

  let sumaIA = 0
  const fPorIa = {}
  for (const id of FUENTES_IA) {
    fPorIa[id] = freqPalabraEnFuente(fila, id)
    sumaIA += fPorIa[id]
  }
  const valor = sumaIA > 0 ? (fPorIa[herramientaId] ?? 0) / sumaIA : null
  return { valor, fPorIa, sumaIA }
}

/** Ejercicio 3: matriz 2×2 Humano ↔ IA desde frecuencias de la tabla de contingencia. */
export function matrizMarkovHumanoIA(resultado) {
  const filas = resultado?.tabla_contingencia?.filas ?? []
  let sumaH = 0
  let sumaIA = 0
  for (const fila of filas) {
    sumaH += freqPalabraEnFuente(fila, ID_HUMANO)
    sumaIA += FUENTES_IA.reduce((s, id) => s + freqPalabraEnFuente(fila, id), 0)
  }
  const suma = sumaH + sumaIA
  if (suma <= 0) {
    return {
      estados: ['Humano', 'IA'],
      matriz: [
        [null, null],
        [null, null],
      ],
      pInicial: { Humano: null, IA: null },
    }
  }

  const pH = sumaH / suma
  const pIA = sumaIA / suma
  const pHtoIA = sumaIA / suma
  const pIAtoH = sumaH / suma

  return {
    estados: ['Humano', 'IA'],
    matriz: [
      [1 - pHtoIA, pHtoIA],
      [pIAtoH, 1 - pIAtoH],
    ],
    pInicial: { Humano: pH, IA: pIA },
    sumaH,
    sumaIA,
    suma,
  }
}

export function palabraTop1PorFuente(resultado, fuenteId) {
  const top = resultado?.fuentes?.[fuenteId]?.top_15
  return top?.[0]?.palabra ?? null
}

export function palabraPorDefecto(resultado) {
  const repetidas = resultado?.palabras_repetidas_top15
  if (repetidas?.length) return repetidas[0]
  const palabras = listarPalabrasTabla(resultado.tabla_contingencia)
  if (palabras.length) return palabras[0]
  return palabraTop1PorFuente(resultado, ID_HUMANO) ?? ''
}

/** Comprueba si un conjunto de probabilidades suma 1 (100 %). */
export function validarSumaProbabilidades(valores, tolerancia = TOLERANCIA_SUMA) {
  const lista = (Array.isArray(valores) ? valores : []).filter(
    (v) => v !== null && v !== undefined && Number.isFinite(Number(v)),
  )
  if (lista.length === 0) {
    return { suma: 0, ok: false, desviacion: -1, n: 0 }
  }
  const suma = lista.reduce((acc, v) => acc + Number(v), 0)
  const ok = Math.abs(suma - 1) <= tolerancia
  return { suma, ok, desviacion: suma - 1, n: lista.length }
}

/** P(origen | palabra) para humano y cada IA (partición de la fila en contingencia). */
export function probabilidadesOrigenDadoPalabra(resultado, palabra) {
  const fila = filaPalabra(resultado.tabla_contingencia, palabra)
  if (!fila) return { probs: {}, sumaFila: 0 }

  const freqs = { [ID_HUMANO]: freqPalabraEnFuente(fila, ID_HUMANO) }
  for (const id of FUENTES_IA) {
    freqs[id] = freqPalabraEnFuente(fila, id)
  }
  const sumaFila = Object.values(freqs).reduce((a, b) => a + b, 0)
  const probs = {}
  for (const [k, f] of Object.entries(freqs)) {
    probs[k] = sumaFila > 0 ? f / sumaFila : null
  }
  return { probs, sumaFila, freqs }
}

/** P(herramienta | IA) según subtotales de columnas IA en la tabla de contingencia. */
export function probabilidadesHerramientaDadoIACorpus(resultado) {
  const { porFuente, totalIA } = extraerTotalesTablaContingencia(resultado?.tabla_contingencia)
  const probs = {}
  for (const id of FUENTES_IA) {
    probs[id] = totalIA > 0 ? (porFuente[id] ?? 0) / totalIA : null
  }
  return probs
}

/** P(IA | palabra): proporción de la fila en columnas IA. */
export function probabilidadIADadoPalabra(resultado, palabra) {
  const fila = filaPalabra(resultado.tabla_contingencia, palabra)
  if (!fila) return { valor: null, numerador: 0, denominador: 0 }
  const numerador = FUENTES_IA.reduce((s, id) => s + freqPalabraEnFuente(fila, id), 0)
  const denominador = Number(fila.total ?? 0)
  return {
    valor: denominador > 0 ? numerador / denominador : null,
    numerador,
    denominador,
  }
}

/** P(humano | palabra): proporción de la fila en columna humano. */
export function probabilidadHumanoDadoPalabra(resultado, palabra) {
  const fila = filaPalabra(resultado.tabla_contingencia, palabra)
  if (!fila) return { valor: null, numerador: 0, denominador: 0 }
  const numerador = freqPalabraEnFuente(fila, ID_HUMANO)
  const denominador = Number(fila.total ?? 0)
  return {
    valor: denominador > 0 ? numerador / denominador : null,
    numerador,
    denominador,
  }
}

/** P(palabra | fuente) = f(palabra, fuente) / N_columna. */
export function probabilidadPalabraDadoFuente(resultado, palabra, fuenteId) {
  return probabilidadCondicionalPalabraIA(resultado, palabra, fuenteId)
}

/** P(fuente | palabra) = f(palabra, fuente) / total de la fila. */
export function probabilidadFuenteDadoPalabra(resultado, palabra, fuenteId) {
  const fila = filaPalabra(resultado?.tabla_contingencia, palabra)
  if (!fila) return { valor: null, numerador: 0, denominador: 0 }
  const numerador = freqPalabraEnFuente(fila, fuenteId)
  const denominador = Number(fila.total ?? 0)
  if (denominador <= 0) return { valor: null, numerador, denominador }
  return { valor: numerador / denominador, numerador, denominador }
}

/** P(palabra) = total de la fila / total general de la tabla. */
export function probabilidadPalabraMarginal(resultado, palabra) {
  const tabla = resultado?.tabla_contingencia
  const { totalGeneral } = extraerTotalesTablaContingencia(tabla)
  const fila = filaPalabra(tabla, palabra)
  const numerador = fila ? Number(fila.total ?? 0) : 0
  const denominador = totalGeneral
  if (denominador <= 0) return { valor: null, numerador, denominador }
  return { valor: numerador / denominador, numerador, denominador }
}

/** Ítems fijos del catálogo de 6 probabilidades Bayes (tipos distintos). */
export const CATALOGO_BAYES_6 = [
  {
    id: '1',
    tipo: 'herramienta_dado_palabra_ia',
    titulo: 'P(herramienta | palabra, IA)',
    descripcion:
      'Ya sabemos que la palabra viene de una IA. ¿Cuál de las tres herramientas la generó?',
    requiereHerramienta: true,
    herramientaDefecto: 'chatgpt',
  },
  {
    id: '2',
    tipo: 'herramienta_dado_palabra_bayes',
    titulo: 'P(herramienta | palabra) — Bayes',
    descripcion:
      'Solo sabemos la palabra, no el autor. Bayes reparte la probabilidad entre Humano y las tres IAs.',
    requiereHerramienta: true,
    herramientaDefecto: 'copilot',
  },
  {
    id: '3',
    tipo: 'herramienta_dado_palabra_ia',
    titulo: 'P(DeepSeek | palabra, IA)',
    descripcion: 'Igual que el ítem 1, pero centrado en DeepSeek como herramienta.',
    requiereHerramienta: true,
    herramientaDefecto: 'deepseek',
  },
  {
    id: '4',
    tipo: 'humano_dado_palabra',
    titulo: 'P(humano | palabra)',
    descripcion: 'Vimos la palabra. ¿Probabilidad de que salga del corpus humano (Don Quijote)?',
    requiereHerramienta: false,
  },
  {
    id: '5',
    tipo: 'ia_dado_palabra',
    titulo: 'P(IA | palabra)',
    descripcion: 'Vimos la palabra. ¿Probabilidad de que venga de alguna IA (Copilot, DeepSeek o ChatGPT)?',
    requiereHerramienta: false,
  },
  {
    id: '6',
    tipo: 'palabra_dado_fuente',
    titulo: 'P(palabra | humano)',
    descripcion:
      'Elegimos una fuente y preguntamos qué tan probable es ver esa palabra en su columna (como en Ej. 1).',
    requiereHerramienta: false,
    fuenteDefecto: ID_HUMANO,
  },
]

export function calcularItemCatalogoBayes(resultado, tipo, palabra, herramientaId) {
  switch (tipo) {
    case 'herramienta_dado_palabra_ia': {
      const r = bayesHerramientaDadoPalabraYIA(resultado, palabra, herramientaId)
      return {
        valor: r.valor,
        detalle: `f(${palabra}, IA_tool) / Σ_IA f = ${r.fPorIa?.[herramientaId] ?? 0} / ${r.sumaIA ?? 0}`,
        formula: 'P(herramienta | palabra, IA)',
        fPorIa: r.fPorIa,
        sumaIA: r.sumaIA,
      }
    }
    case 'herramienta_dado_palabra_bayes': {
      const r = bayesHerramientaDadoPalabra(resultado, palabra, herramientaId)
      return {
        valor: r.valor,
        detalle: `P(p|h)·P(h)/P(p) con tabla de contingencia`,
        formula: 'P(herramienta | palabra)',
        bayes: r,
      }
    }
    case 'humano_dado_palabra': {
      const r = probabilidadHumanoDadoPalabra(resultado, palabra)
      return {
        valor: r.valor,
        detalle: `f(humano) / total fila = ${r.numerador} / ${r.denominador}`,
        formula: 'P(humano | palabra)',
        numerador: r.numerador,
        denominador: r.denominador,
      }
    }
    case 'ia_dado_palabra': {
      const r = probabilidadIADadoPalabra(resultado, palabra)
      return {
        valor: r.valor,
        detalle: `Σ_IA f / total fila = ${r.numerador} / ${r.denominador}`,
        formula: 'P(IA | palabra)',
        numerador: r.numerador,
        denominador: r.denominador,
      }
    }
    case 'palabra_dado_fuente': {
      const fuente = herramientaId || ID_HUMANO
      const r = probabilidadPalabraDadoFuente(resultado, palabra, fuente)
      return {
        valor: r.valor,
        detalle: `f / N_columna = ${r.numerador} / ${r.denominador}`,
        formula: `P(palabra | ${fuente})`,
        numerador: r.numerador,
        denominador: r.denominador,
      }
    }
    default:
      return { valor: null, detalle: '', formula: '' }
  }
}

export function palabrasDefectoCatalogo(resultado) {
  const repetidas = resultado?.palabras_repetidas_top15 ?? []
  const todas = listarPalabrasTabla(resultado.tabla_contingencia)
  const base = repetidas.length ? repetidas : todas
  const fallback = palabraPorDefecto(resultado)
  const out = []
  for (let i = 0; i < 6; i++) {
    out.push(base[i] ?? todas[i] ?? fallback)
  }
  return out
}

/** P(herramienta | palabra, IA) para las tres herramientas. */
export function probabilidadesHerramientaDadoPalabraYIA(resultado, palabra) {
  const probs = {}
  for (const id of FUENTES_IA) {
    probs[id] = bayesHerramientaDadoPalabraYIA(resultado, palabra, id).valor
  }
  return probs
}

/** Validaciones del Ejercicio 2 (Bayes). */
export function validarEjercicio2Bayes(resultado, palabra, modo = 'ia') {
  const marg = extraerTotalesTablaContingencia(resultado?.tabla_contingencia)
  const pHumano =
    marg.totalGeneral > 0 ? marg.totalHumano / marg.totalGeneral : null
  const pIA = marg.totalGeneral > 0 ? marg.totalIA / marg.totalGeneral : null

  const autorCorpus = validarSumaProbabilidades([pHumano, pIA])

  const origen = probabilidadesOrigenDadoPalabra(resultado, palabra)
  const origenDadoPalabra = validarSumaProbabilidades(Object.values(origen.probs))

  const pHerramientaDadoIA = Object.values(probabilidadesHerramientaDadoIACorpus(resultado))
  const herramientaDadoIA = validarSumaProbabilidades(pHerramientaDadoIA)

  const pIApalabra = Object.values(probabilidadesHerramientaDadoPalabraYIA(resultado, palabra))
  const modoIA = validarSumaProbabilidades(pIApalabra)

  const modoGlobal = origenDadoPalabra

  const modoActivo = modo === 'ia' ? modoIA : modoGlobal

  return {
    autorCorpus,
    origenDadoPalabra,
    herramientaDadoIA,
    modoIA,
    modoGlobal,
    modoActivo,
    todasOk:
      autorCorpus.ok &&
      origenDadoPalabra.ok &&
      herramientaDadoIA.ok &&
      modoIA.ok &&
      modoActivo.ok,
    origen,
    pHerramientaDadoIA: probabilidadesHerramientaDadoIACorpus(resultado),
    pIApalabra: probabilidadesHerramientaDadoPalabraYIA(resultado, palabra),
  }
}

/** Validaciones del Ejercicio 3 (Markov). */
export function validarEjercicio3Markov(markov) {
  const distribucionInicial = validarSumaProbabilidades([
    markov.pInicial?.Humano,
    markov.pInicial?.IA,
  ])

  const filaHumano = validarSumaProbabilidades(markov.matriz?.[0] ?? [])
  const filaIA = validarSumaProbabilidades(markov.matriz?.[1] ?? [])

  const filasTransicion = [filaHumano, filaIA]
  const todasFilasOk = filasTransicion.every((f) => f.ok)

  return {
    distribucionInicial,
    filaHumano,
    filaIA,
    filasTransicion,
    todasOk: distribucionInicial.ok && todasFilasOk,
  }
}
