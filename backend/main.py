from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math
import numpy as np
from scipy import stats

from text_analysis import (
    ARCHIVOS_SERVIDOR,
    FUENTES_CORPUS,
    analizar_corpus,
    cargar_corpus_desde_directorio,
    ruta_archivo_fuente,
)

CORPUS_DIR = Path(__file__).resolve().parent / "data" / "corpus"

app = FastAPI()

# Configuración de CORS vital para conectar con React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite conexiones desde cualquier origen (ideal para desarrollo)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Estructura de los datos que esperamos recibir de React
class DatosEntrada(BaseModel):
    datos: list[float]
    es_muestra: bool = False
    porcentaje_muestra: float | None = 100.0
    metodo_muestreo: str | None = "simple"


class CorpusEntrada(BaseModel):
    """Textos por fuente; si `usar_servidor` es True, se leen los archivos del directorio corpus."""
    humano: str | None = None
    copilot: str | None = None
    deepseek: str | None = None
    chatgpt: str | None = None
    usar_servidor: bool = False
    nombres_archivo: dict[str, str] | None = None

def _redondear_seguro(valor: float, decimales: int = 5) -> float | None:
    x = float(valor)
    if not np.isfinite(x):
        return None
    return round(x, decimales)


def _redondear_ingredientes(obj: dict, decimales: int = 5) -> dict:
    """Redondea floats en un dict plano; enteros se conservan; no finitos → null JSON."""
    out: dict = {}
    for k, v in obj.items():
        if k == "valor":
            continue
        if isinstance(v, float):
            out[k] = round(v, decimales) if np.isfinite(v) else None
        else:
            out[k] = v
    return out


def _clasificar_asimetria(valor: float) -> str:
    if not np.isfinite(valor):
        return "No aplicable (Varianza 0)"
    if valor > 0.05:
        return "Asimetría Positiva"
    if valor < -0.05:
        return "Asimetría Negativa"
    return "Simétrica"


def _clasificar_curtosis(valor: float) -> str:
    if not np.isfinite(valor):
        return "No aplicable (Varianza 0)"
    if valor > 0.05:
        return "Leptocúrtica"
    if valor < -0.05:
        return "Platicúrtica"
    return "Mesocúrtica"


def _muestrear_arreglo(
    arreglo: np.ndarray,
    n_muestra: int,
    metodo: str,
    rng: np.random.Generator,
) -> np.ndarray:
    """Devuelve un subconjunto de tamaño n_muestra (sin repetir índices salvo imposibilidad)."""
    n_muestra = max(1, min(int(n_muestra), len(arreglo)))
    n = len(arreglo)
    metodo = (metodo or "simple").lower().strip()

    if metodo == "simple":
        idx = rng.choice(n, size=n_muestra, replace=False)
        return arreglo[idx].copy()

    if metodo == "sistematico":
        k = max(1, n // n_muestra)
        start = int(rng.integers(0, k))
        idx = start + np.arange(n_muestra, dtype=np.int64) * k
        idx = idx[idx < n]
        if len(idx) < n_muestra:
            pool = np.setdiff1d(np.arange(n), idx)
            need = n_muestra - len(idx)
            if need > 0 and len(pool) > 0:
                take = min(need, len(pool))
                extra = rng.choice(pool, size=take, replace=False)
                idx = np.unique(np.concatenate([idx, extra]))
        if len(idx) > n_muestra:
            idx = idx[:n_muestra]
        elif len(idx) < n_muestra:
            pool = np.setdiff1d(np.arange(n), idx)
            need = n_muestra - len(idx)
            if need > 0 and len(pool) > 0:
                extra = rng.choice(pool, size=min(need, len(pool)), replace=False)
                idx = np.concatenate([idx, extra])
        return arreglo[idx[:n_muestra]].copy()

    if metodo == "estratos":
        n_estratos = 4 if n >= 16 else 3
        orden = np.argsort(arreglo)
        estratos = np.array_split(orden, n_estratos)
        sizes = np.array([len(e) for e in estratos], dtype=float)
        total_sz = float(sizes.sum())
        if total_sz <= 0:
            return _muestrear_arreglo(arreglo, n_muestra, "simple", rng)
        alloc = np.rint(n_muestra * sizes / total_sz).astype(int)
        alloc = np.maximum(alloc, 0)
        while int(alloc.sum()) < n_muestra:
            alloc[int(np.argmax(sizes))] += 1
        while int(alloc.sum()) > n_muestra:
            i = int(np.argmax(alloc))
            if alloc[i] > 0:
                alloc[i] -= 1
            else:
                break
        partes: list[np.ndarray] = []
        for estrato, a in zip(estratos, alloc):
            a = int(min(a, len(estrato)))
            if a <= 0:
                continue
            elegidos = rng.choice(estrato, size=a, replace=False)
            partes.append(elegidos)
        if not partes:
            return _muestrear_arreglo(arreglo, n_muestra, "simple", rng)
        idx = np.concatenate(partes)
        if len(idx) < n_muestra:
            pool = np.setdiff1d(np.arange(n), idx)
            need = n_muestra - len(idx)
            if need > 0 and len(pool) > 0:
                extra = rng.choice(pool, size=min(need, len(pool)), replace=False)
                idx = np.concatenate([idx, extra])
        return arreglo[idx[:n_muestra]].copy()

    if metodo == "conglomerados":
        k = max(2, min(max(2, n // max(n_muestra, 1)), min(20, n)))
        bloques = np.array_split(np.arange(n), k)
        orden_bloques = rng.permutation(k)
        seleccion: list[int] = []
        for j in orden_bloques:
            bloque = bloques[int(j)]
            if len(seleccion) + len(bloque) <= n_muestra:
                seleccion.extend(bloque.tolist())
        if len(seleccion) < n_muestra:
            resto = np.setdiff1d(np.arange(n), seleccion)
            faltan = n_muestra - len(seleccion)
            if faltan > 0 and len(resto) > 0:
                add = rng.choice(resto, size=min(faltan, len(resto)), replace=False)
                seleccion.extend(add.tolist())
        idx = np.array(seleccion[:n_muestra], dtype=int)
        return arreglo[idx].copy()

    return _muestrear_arreglo(arreglo, n_muestra, "simple", rng)


def _sturges_k(n: int) -> int:
    """Número de clases por la regla de Sturges: k = 1 + 3.322·log10(n), redondeado."""
    if n <= 0:
        return 1
    k = int(round(1.0 + 3.322 * np.log10(n)))
    return max(1, k)


def _max_decimales_arreglo(arreglo: np.ndarray, max_decimales: int = 10) -> int:
    """Máximo número de decimales significativos presentes en los datos."""
    dec_max = 0
    for x in arreglo.astype(float).tolist():
        if not np.isfinite(x):
            continue
        xv = float(x)
        d_encontrado = 0
        for d in range(max_decimales + 1):
            if np.isclose(xv, round(xv, d), rtol=0.0, atol=1e-10):
                d_encontrado = d
                break
        dec_max = max(dec_max, d_encontrado)
    return dec_max


def _tabla_frecuencias_agrupadas(
    arreglo: np.ndarray,
) -> tuple[list[dict], int, float | None, float | None]:
    """
    Tabla de frecuencias con intervalos [Li - Ls), fi, hi, Fi, Hi.
    Devuelve (filas, k_sturges, amplitud_exacta, amplitud_aplicada).
    """
    n = int(len(arreglo))
    k = _sturges_k(n)
    x_min = float(np.min(arreglo)) if n else 0.0
    x_max = float(np.max(arreglo)) if n else 0.0
    rango = x_max - x_min
    amplitud_exacta: float | None = (rango / k) if k > 0 else None

    decimales = _max_decimales_arreglo(arreglo)
    factor = 10 ** decimales
    amplitud_aplicada: float | None = None
    if amplitud_exacta is not None:
        amplitud_aplicada = math.ceil(float(amplitud_exacta) * factor) / factor
        if amplitud_aplicada <= 0:
            amplitud_aplicada = 1.0 / factor

    # Cortes construidos por suma de amplitud aplicada desde el mínimo.
    if amplitud_aplicada is None:
        edges_arr = np.array([x_min, x_max], dtype=float)
    else:
        edges_arr = np.array(
            [x_min + (i * amplitud_aplicada) for i in range(k + 1)],
            dtype=float,
        )
    fi, _ = np.histogram(arreglo, bins=edges_arr)
    fi = fi.astype(int)
    k_efectivo = len(edges_arr) - 1

    filas: list[dict] = []
    Fi = 0
    for i in range(k_efectivo):
        lo, hi = float(edges_arr[i]), float(edges_arr[i + 1])
        f = int(fi[i])
        Fi += f
        hi_rel = (f / n) if n else 0.0
        hi_r = round(float(hi_rel), 5)
        Hi_r = round(float(Fi / n), 5) if n else 0.0
        intervalo = f"[{lo} - {hi})"
        filas.append(
            {
                "intervalo": intervalo,
                "limite_inf": round(lo, 10),
                "limite_sup": round(hi, 10),
                # Claves estándar (y alias) para frecuencia.
                "f": f,
                "fi": f,
                "h": hi_r,
                "hi": hi_r,
                "F": Fi,
                "Fi": Fi,
                "H": Hi_r,
                "Hi": Hi_r,
            }
        )
    return filas, k, amplitud_exacta, amplitud_aplicada


def _tallo_hoja(arreglo: np.ndarray) -> dict[str, list[int]]:
    """
    Tallo y hoja: escala entera o un decimal según los datos; clave = tallo (str), valor = hojas ordenadas.
    """
    arr = arreglo.astype(float)
    if len(arr) == 0:
        return {}

    red1 = np.round(arr, 1)
    red_int = np.round(arr)
    usar_un_decimal = not np.allclose(red1, red_int, rtol=0.0, atol=1e-9)

    if usar_un_decimal:
        scaled = np.round(arr * 10.0).astype(np.int64)
    else:
        scaled = np.round(arr).astype(np.int64)

    tallos: dict[int, list[int]] = {}
    for v in scaled.tolist():
        vi = int(v)
        sign = -1 if vi < 0 else 1
        av = abs(vi)
        stem_mag = av // 10
        leaf = av % 10
        stem = sign * stem_mag
        tallos.setdefault(stem, []).append(int(leaf))

    for t in tallos:
        tallos[t].sort()

    return {str(t): tallos[t] for t in sorted(tallos.keys())}


def _tabla_medias_moviles(arreglo: np.ndarray) -> list[dict]:
    """
    Una fila por índice i = 0..N-1 (misma longitud que arreglo).

    N < 4: no hay medias móviles válidas; mm3, mm4_1 y mm4_2 son None en todas las filas.

    MM3 (centrada, orden 3): para i en [1, N-2], promedio de arreglo[i-1], [i], [i+1].
    Índices 0 y N-1: None.

    MM4,1 (promedio de 4): para i en [1, N-3], promedio de arreglo[i-1]..[i+2].
    Índice 0 y N-2, N-1: None.

    MM4,2 (centrada sobre MM4,1): para i en [2, N-3], promedio de mm4_1[i-1] y mm4_1[i].
    Índices 0, 1 y N-2, N-1: None.

    Resultados redondeados a 5 decimales.
    """
    n = int(len(arreglo))
    if n == 0:
        return []

    mm3: list[float | None] = [None] * n
    mm4_1: list[float | None] = [None] * n
    mm4_2: list[float | None] = [None] * n

    if n >= 4:
        for i in range(1, n - 1):
            mm3[i] = float(np.mean(arreglo[i - 1 : i + 2]))
        for i in range(1, n - 2):
            mm4_1[i] = float(np.mean(arreglo[i - 1 : i + 3]))
        for i in range(2, n - 2):
            a = mm4_1[i - 1]
            b = mm4_1[i]
            if a is not None and b is not None:
                mm4_2[i] = (a + b) / 2.0

    filas: list[dict] = []
    for i in range(n):
        dato = float(arreglo[i])
        filas.append(
            {
                "dato": round(dato, 5),
                "mm3": None if mm3[i] is None else round(float(mm3[i]), 5),
                "mm4_1": None if mm4_1[i] is None else round(float(mm4_1[i]), 5),
                "mm4_2": None if mm4_2[i] is None else round(float(mm4_2[i]), 5),
            }
        )
    return filas


@app.get("/api/corpus/archivos")
def listar_archivos_corpus():
    """Indica qué archivos del corpus están disponibles en el servidor."""
    archivos = []
    for nombre in FUENTES_CORPUS:
        nombre_archivo = ARCHIVOS_SERVIDOR.get(nombre, f"{nombre}.txt")
        ruta = ruta_archivo_fuente(CORPUS_DIR, nombre)
        existe = ruta is not None
        archivos.append(
            {
                "fuente": nombre,
                "nombre_archivo": nombre_archivo,
                "existe": existe,
                "ruta": str(ruta) if existe else str(CORPUS_DIR / nombre_archivo),
                "bytes": ruta.stat().st_size if existe else 0,
            }
        )
    return {"directorio": str(CORPUS_DIR), "archivos": archivos}


@app.post("/api/corpus/analizar")
def analizar_archivos_corpus(entrada: CorpusEntrada):
    """
    Procesa corpus de texto: limpieza, normalización, top 15 por fuente
    y tabla de contingencia con frecuencias cruzadas.
    """
    nombres_archivo: dict[str, str] = {}

    if entrada.usar_servidor:
        fuentes, nombres_archivo = cargar_corpus_desde_directorio(CORPUS_DIR)
    else:
        fuentes = {
            "humano": entrada.humano or "",
            "copilot": entrada.copilot or "",
            "deepseek": entrada.deepseek or "",
            "chatgpt": entrada.chatgpt or "",
        }
        if entrada.nombres_archivo:
            nombres_archivo.update(entrada.nombres_archivo)
        for nombre in FUENTES_CORPUS:
            if (fuentes.get(nombre) or "").strip() and nombre not in nombres_archivo:
                nombres_archivo[nombre] = ARCHIVOS_SERVIDOR.get(nombre, f"{nombre}.txt")

    if not any((v or "").strip() for v in fuentes.values()):
        raise HTTPException(
            status_code=400,
            detail="No hay texto para analizar. Sube archivos o activa usar_servidor.",
        )

    return analizar_corpus(fuentes, nombres_archivo)


@app.post("/api/descriptiva")
def calcular_descriptiva(payload: DatosEntrada):
    arreglo_original = np.asarray(payload.datos, dtype=float)

    # Si el arreglo está vacío, evitamos errores
    if len(arreglo_original) == 0:
        return {"error": "No se enviaron datos"}

    pct = payload.porcentaje_muestra
    if pct is None:
        pct = 100.0
    pct = float(pct)

    rng = np.random.default_rng()

    aplicar_muestreo = payload.es_muestra and pct < 100.0
    if aplicar_muestreo:
        n_muestra_objetivo = int(len(arreglo_original) * (pct / 100.0))
        n_muestra_objetivo = max(1, min(n_muestra_objetivo, len(arreglo_original)))
        metodo_norm = (payload.metodo_muestreo or "simple").lower().strip()
        if metodo_norm not in ("simple", "sistematico", "estratos", "conglomerados"):
            metodo_norm = "simple"
        arreglo = _muestrear_arreglo(arreglo_original, n_muestra_objetivo, metodo_norm, rng)
        metodo_reportado = metodo_norm
    else:
        arreglo = arreglo_original.copy()
        metodo_reportado = "completo"

    datos_procesados = {
        "n_original": int(len(arreglo_original)),
        "n_muestra": int(len(arreglo)),
        "metodo": metodo_reportado,
    }

    ddof = 1 if payload.es_muestra else 0
    n = int(len(arreglo))

    # --- Tendencia central (ingredientes con numpy / scipy) ---
    suma_x = float(np.sum(arreglo))
    media = float(np.mean(arreglo))

    mediana = float(np.median(arreglo))
    ordenado = np.sort(arreglo)
    if n % 2 == 1:
        idx = n // 2
        elemento_central_1 = float(ordenado[idx])
        elemento_central_2 = elemento_central_1
    else:
        elemento_central_1 = float(ordenado[n // 2 - 1])
        elemento_central_2 = float(ordenado[n // 2])

    moda_resultado = stats.mode(arreglo, keepdims=True)
    moda = float(moda_resultado.mode[0])
    conteo_moda = int(moda_resultado.count[0])

    # --- Dispersión ---
    x_min = float(np.min(arreglo))
    x_max = float(np.max(arreglo))
    rango = float(np.ptp(arreglo))

    diferencias = arreglo - media
    suma_cuadrados_dif = float(np.sum(diferencias**2))
    grados_libertad = int(n - ddof)
    varianza = float(np.var(arreglo, ddof=ddof))
    desviacion = float(np.std(arreglo, ddof=ddof))

    if media != 0 and np.isfinite(desviacion):
        coef_variacion = (desviacion / abs(media)) * 100
    else:
        coef_variacion = float("nan")

    todas_positivas = bool(np.all(arreglo > 0))
    if todas_positivas:
        media_geom = float(stats.gmean(arreglo))
        media_arm = float(stats.hmean(arreglo))
        suma_ln_x = float(np.sum(np.log(arreglo)))
        suma_inv_x = float(np.sum(1.0 / arreglo))
        bloque_geom = {
            "valor": round(media_geom, 5),
            **_redondear_ingredientes(
                {
                    "n": n,
                    "suma_ln_x": suma_ln_x,
                },
                decimales=5,
            ),
        }
        bloque_arm = {
            "valor": round(media_arm, 5),
            **_redondear_ingredientes(
                {
                    "n": n,
                    "suma_uno_sobre_x": suma_inv_x,
                },
                decimales=5,
            ),
        }
    else:
        bloque_geom = {
            "valor": None,
            "n": None,
            "suma_ln_x": None,
        }
        bloque_arm = {
            "valor": None,
            "n": None,
            "suma_uno_sobre_x": None,
        }

    tabla_mm = _tabla_medias_moviles(arreglo)
    medidas_especiales = {
        "media_geometrica": bloque_geom,
        "media_armonica": bloque_arm,
        "medias_moviles": tabla_mm,
    }

    q1, q2, q3 = np.percentile(arreglo, [25, 50, 75])
    deciles_pct = list(range(10, 100, 10))
    deciles_vals = np.percentile(arreglo, deciles_pct)
    deciles_dict = {
        f"d{k}": round(float(deciles_vals[k - 1]), 5) for k in range(1, 10)
    }
    percentiles_arr = np.percentile(arreglo, list(range(1, 100)))
    percentiles_dict = {
        str(i): round(float(percentiles_arr[i - 1]), 5) for i in range(1, 100)
    }

    medidas_posicion = {
        "n": n,
        "cuartiles": {
            "q1": round(float(q1), 5),
            "q2": round(float(q2), 5),
            "q3": round(float(q3), 5),
        },
        "deciles": deciles_dict,
        "percentiles": percentiles_dict,
    }

    tabla_freq, k_sturges, amp_exacta, amp_aplicada = _tabla_frecuencias_agrupadas(arreglo)
    k_exacto = 1.0 + 3.322 * np.log10(n) if n > 0 else 1.0
    tallo_hoja_dict = _tallo_hoja(arreglo)

    tendencia_central = {
        "media": {
            "valor": round(media, 5),
            **_redondear_ingredientes(
                {"suma_x": suma_x, "n": n},
                decimales=5,
            ),
        },
        "mediana": {
            "valor": round(mediana, 5),
            **_redondear_ingredientes(
                {
                    "n": n,
                    "elemento_central_1": elemento_central_1,
                    "elemento_central_2": elemento_central_2,
                },
                decimales=5,
            ),
        },
        "moda": {
            "valor": round(moda, 5),
            **_redondear_ingredientes(
                {"n": n, "conteo_moda": conteo_moda},
                decimales=5,
            ),
        },
    }

    dispersion = {
        "rango": {
            "valor": round(rango, 5),
            **_redondear_ingredientes(
                {"minimo": x_min, "maximo": x_max, "n": n},
                decimales=5,
            ),
        },
        "varianza": {
            "valor": _redondear_seguro(varianza),
            **_redondear_ingredientes(
                {
                    "suma_cuadrados_dif": suma_cuadrados_dif,
                    "n": n,
                    "grados_libertad": grados_libertad,
                    "ddof": ddof,
                    "media_usada": media,
                },
                decimales=5,
            ),
        },
        "desviacion_estandar": {
            "valor": _redondear_seguro(desviacion),
            **_redondear_ingredientes(
                {"varianza": varianza},
                decimales=5,
            ),
        },
        "coeficiente_variacion": {
            "valor": _redondear_seguro(coef_variacion),
            **_redondear_ingredientes(
                {
                    "desviacion_estandar": desviacion,
                    "media": media,
                },
                decimales=5,
            ),
        },
    }

    # --- Medidas de forma (sesgo y curtosis de Fisher) ---
    n_val = int(len(arreglo))
    media_val = float(np.mean(arreglo))
    desv_val = float(np.std(arreglo, ddof=1)) if n_val > 1 else float("nan")
    suma_cubos = float(np.sum((arreglo - media_val) ** 3))
    suma_cuartas = float(np.sum((arreglo - media_val) ** 4))
    ingredientes_asimetria = _redondear_ingredientes(
        {
            "n": n_val,
            "media": media_val,
            "desv": desv_val,
            "suma_cubos": suma_cubos,
        },
        decimales=5,
    )
    ingredientes_curtosis = _redondear_ingredientes(
        {
            "n": n_val,
            "media": media_val,
            "desv": desv_val,
            "suma_cuartas": suma_cuartas,
        },
        decimales=5,
    )

    # Sin varianza no aplican valor/clasificación, pero sí retornamos ingredientes.
    varianza_cero = rango == 0.0
    if varianza_cero:
        medidas_forma = {
            "asimetria": {
                "valor": None,
                "clasificacion": "No aplicable (Varianza 0)",
                **ingredientes_asimetria,
            },
            "curtosis": {
                "valor": None,
                "clasificacion": "No aplicable (Varianza 0)",
                **ingredientes_curtosis,
            },
        }
    else:
        asimetria_v = float(stats.skew(arreglo, bias=False))
        curtosis_v = float(stats.kurtosis(arreglo, fisher=True, bias=False))
        medidas_forma = {
            "asimetria": {
                "valor": _redondear_seguro(asimetria_v),
                "clasificacion": _clasificar_asimetria(asimetria_v),
                **ingredientes_asimetria,
            },
            "curtosis": {
                "valor": _redondear_seguro(curtosis_v),
                "clasificacion": _clasificar_curtosis(curtosis_v),
                **ingredientes_curtosis,
            },
        }

    # Devolvemos un JSON impecable
    return {
        "datos_procesados": datos_procesados,
        "tendencia_central": tendencia_central,
        "dispersion": dispersion,
        "medidas_especiales": medidas_especiales,
        "medidas_forma": medidas_forma,
        "medidas_posicion": medidas_posicion,
        "valores": [round(float(x), 10) for x in arreglo.tolist()],
        "distribucion_frecuencias": {
            "tabla": tabla_freq,
            "tallo_hoja": tallo_hoja_dict,
            "k_sturges": k_sturges,
            "amplitud": amp_aplicada,
            "parametros": {
                "rango": float(rango),
                "n": n,
                "k_exacto": float(k_exacto),
                "k_redondeado": int(k_sturges),
                "amplitud_exacta": None if amp_exacta is None else round(float(amp_exacta), 4),
                "amplitud_aplicada": None if amp_aplicada is None else round(float(amp_aplicada), 4),
                # Compatibilidad con frontend previo.
                "amplitud_redondeada": None if amp_aplicada is None else round(float(amp_aplicada), 4),
                "amplitud": None if amp_aplicada is None else round(float(amp_aplicada), 4),
            },
        },
    }