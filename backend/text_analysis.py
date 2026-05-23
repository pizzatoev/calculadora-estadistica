"""Procesamiento de corpus de texto: limpieza, tokenización y tablas de contingencia."""
from __future__ import annotations

import re
import unicodedata
from collections import Counter
from pathlib import Path

from stopwords_es import obtener_stopwords_es

FUENTES_CORPUS = ("humano", "copilot", "deepseek", "chatgpt")
TOP_N = 15

METADATOS_FUENTES = {
    "humano": {
        "titulo_obra": "Don Quijote de la Mancha",
        "autor": "Miguel de Cervantes",
        "descripcion": (
            "Texto de referencia (libro humano): fragmento de la novela usado como "
            "corpus base para comparar con respuestas generadas por IA."
        ),
    },
    "copilot": {
        "titulo_obra": "Ensayos sobre Don Quijote (tema del proyecto)",
        "autor": "Microsoft Copilot",
        "descripcion": (
            "Texto generado por Copilot a partir de los mismos temas del Quijote; "
            "sirve para contrastar estilo y vocabulario frente al libro."
        ),
    },
    "deepseek": {
        "titulo_obra": "Ensayos sobre Don Quijote (tema del proyecto)",
        "autor": "DeepSeek",
        "descripcion": (
            "Texto generado por DeepSeek con enfoque académico sobre la obra; "
            "complementa la comparación entre fuentes IA."
        ),
    },
    "chatgpt": {
        "titulo_obra": "Ensayos sobre Don Quijote (tema del proyecto)",
        "autor": "ChatGPT",
        "descripcion": (
            "Texto generado por ChatGPT sobre temas de Don Quijote; "
            "se analiza junto al corpus humano y las otras IAs."
        ),
    },
}

# Archivos reales en backend/data/corpus
ARCHIVOS_SERVIDOR: dict[str, str] = {
    "humano": "humano.txt",
    "copilot": "copilot.txt",
    "deepseek": "deepseek.txt",
    "chatgpt": "chatgpt.txt",
}

# Palabras en español (letras incl. tildes y ñ)
_RE_PALABRA = re.compile(r"[a-záéíóúüñ]+", re.IGNORECASE)


def normalizar_texto(texto: str) -> str:
    """Minúsculas, NFKD y eliminación de marcas diacríticas para agrupar variantes."""
    if not texto:
        return ""
    t = texto.lower()
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    return t


def rtf_a_texto(rtf: str) -> str:
    """Extrae texto plano de un documento RTF (suficiente para conteo de palabras)."""
    if not rtf:
        return ""

    def _decodificar_escape(match: re.Match[str]) -> str:
        return bytes([int(match.group(1), 16)]).decode("latin-1", errors="replace")

    texto = re.sub(r"\\'([0-9a-fA-F]{2})", _decodificar_escape, rtf)
    texto = (
        texto.replace("\\par", "\n")
        .replace("\\line", "\n")
        .replace("\\tab", " ")
    )
    # Elimina bloques binarios habituales en RTF exportado
    texto = re.sub(r"\{\\\*?\\[a-z]+.*?;\}", " ", texto, flags=re.DOTALL | re.IGNORECASE)
    texto = re.sub(r"\\[a-z]+-?\d*\s?", " ", texto)
    texto = re.sub(r"[{}]", " ", texto)
    return limpiar_texto(texto)


def preparar_texto_crudo(contenido: str, nombre_archivo: str = "") -> str:
    """Normaliza .txt o .rtf (por contenido o extensión) a texto plano."""
    if not contenido:
        return ""
    inicio = contenido.lstrip()[:10].lower()
    es_rtf = nombre_archivo.lower().endswith(".rtf") or inicio.startswith("{\\rtf")
    if es_rtf:
        return rtf_a_texto(contenido)
    return contenido


def limpiar_texto(texto: str) -> str:
    """Quita caracteres de control y colapsa espacios en blanco."""
    if not texto:
        return ""
    t = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", texto)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def tokenizar(texto: str, excluir_stopwords: bool = True) -> list[str]:
    """Tokeniza tras limpieza y normalización; opcionalmente excluye stopwords."""
    limpio = limpiar_texto(texto)
    norm = normalizar_texto(limpio)
    tokens = _RE_PALABRA.findall(norm)
    if not excluir_stopwords:
        return tokens
    stopwords = obtener_stopwords_es()
    return [t for t in tokens if t not in stopwords]


def contar_palabras(texto: str) -> Counter[str]:
    """Cuenta solo palabras de contenido (sin stopwords en español)."""
    return Counter(tokenizar(texto, excluir_stopwords=True))


def top_palabras(conteo: Counter[str], n: int = TOP_N) -> list[dict[str, int | str]]:
    return [
        {"palabra": palabra, "frecuencia": int(freq)}
        for palabra, freq in conteo.most_common(n)
    ]


def palabras_en_top_de_varias_fuentes(
    tops: dict[str, list[dict[str, int | str]]], min_fuentes: int = 2
) -> list[str]:
    apariciones: Counter[str] = Counter()
    for items in tops.values():
        for item in items:
            apariciones[str(item["palabra"])] += 1
    return sorted(p for p, c in apariciones.items() if c >= min_fuentes)


def construir_tabla_contingencia(
    conteos: dict[str, Counter[str]],
    palabras: list[str] | None = None,
) -> dict:
    """Tabla cruzada palabra × fuente con frecuencias absolutas."""
    if palabras is None:
        palabras_set: set[str] = set()
        for c in conteos.values():
            for palabra, _ in c.most_common(TOP_N):
                palabras_set.add(palabra)
        palabras = sorted(palabras_set)

    filas = []
    totales_fila: list[int] = []
    for palabra in palabras:
        fila: dict[str, int | str] = {"palabra": palabra}
        total = 0
        for fuente in FUENTES_CORPUS:
            freq = int(conteos.get(fuente, Counter()).get(palabra, 0))
            fila[fuente] = freq
            total += freq
        fila["total"] = total
        filas.append(fila)
        totales_fila.append(total)

    totales_columna: dict[str, int] = {"palabra": "Total"}
    gran_total = 0
    for fuente in FUENTES_CORPUS:
        col_total = sum(int(conteos.get(fuente, Counter()).get(p, 0)) for p in palabras)
        totales_columna[fuente] = col_total
        gran_total += col_total
    totales_columna["total"] = gran_total

    return {
        "columnas": list(FUENTES_CORPUS) + ["total"],
        "filas": filas,
        "totales": totales_columna,
    }


def analizar_corpus(
    fuentes_texto: dict[str, str],
    nombres_archivo: dict[str, str] | None = None,
) -> dict:
    """
    Analiza textos por fuente.
    `fuentes_texto`: claves en FUENTES_CORPUS → contenido del archivo.
    """
    nombres_archivo = nombres_archivo or {}
    conteos: dict[str, Counter[str]] = {}
    resumen_fuentes: dict[str, dict] = {}

    for nombre in FUENTES_CORPUS:
        crudo = fuentes_texto.get(nombre, "") or ""
        texto = preparar_texto_crudo(crudo, nombres_archivo.get(nombre, ""))
        conteo = contar_palabras(texto)
        conteos[nombre] = conteo
        tokens = sum(conteo.values())
        vocabulario = len(conteo)
        resumen_fuentes[nombre] = {
            "total_tokens": tokens,
            "vocabulario_unico": vocabulario,
            "top_15": top_palabras(conteo, TOP_N),
            "archivo_cargado": bool(texto.strip()),
            "nombre_archivo": nombres_archivo.get(nombre) or ARCHIVOS_SERVIDOR.get(nombre),
        }

    tops = {k: v["top_15"] for k, v in resumen_fuentes.items()}
    repetidas = palabras_en_top_de_varias_fuentes(tops, min_fuentes=2)
    tabla = construir_tabla_contingencia(conteos)

    return {
        "fuentes": resumen_fuentes,
        "palabras_repetidas_top15": repetidas,
        "tabla_contingencia": tabla,
        "metadatos_fuentes": METADATOS_FUENTES,
        "parametros": {
            "top_n": TOP_N,
            "fuentes": list(FUENTES_CORPUS),
            "stopwords_filtradas": True,
            "total_stopwords": len(obtener_stopwords_es()),
        },
    }


def leer_contenido_fuente(directorio: Path, fuente: str, max_caracteres: int = 80_000) -> dict:
    """Lee el .txt de una fuente (servidor) con límite opcional de caracteres."""
    if fuente not in FUENTES_CORPUS:
        raise ValueError(f"Fuente no válida: {fuente}")
    contenido, nombre = leer_archivo_fuente(directorio, fuente)
    if not (contenido or "").strip():
        raise FileNotFoundError(f"No hay archivo para la fuente {fuente}")
    total = len(contenido)
    truncado = total > max_caracteres
    meta = METADATOS_FUENTES.get(fuente, {})
    return {
        "fuente": fuente,
        "nombre_archivo": nombre,
        "contenido": contenido[:max_caracteres] if truncado else contenido,
        "total_caracteres": total,
        "truncado": truncado,
        "titulo_obra": meta.get("titulo_obra"),
        "autor": meta.get("autor"),
        "descripcion": meta.get("descripcion"),
    }


def ruta_archivo_fuente(directorio: Path, fuente: str) -> Path | None:
    """Devuelve la ruta del archivo de una fuente si existe en el directorio."""
    nombre = ARCHIVOS_SERVIDOR.get(fuente)
    if not nombre:
        return None
    ruta = directorio / nombre
    return ruta if ruta.is_file() else None


def leer_archivo_fuente(directorio: Path, fuente: str) -> tuple[str, str]:
    """Lee contenido y nombre de archivo de una fuente."""
    ruta = ruta_archivo_fuente(directorio, fuente)
    if ruta is None:
        return "", ""
    contenido = ruta.read_text(encoding="utf-8", errors="replace")
    return contenido, ruta.name


def cargar_corpus_desde_directorio(directorio: Path) -> tuple[dict[str, str], dict[str, str]]:
    """Lee humano.txt, copilot.txt, etc. del directorio si existen."""
    textos: dict[str, str] = {}
    nombres: dict[str, str] = {}
    for nombre in FUENTES_CORPUS:
        contenido, archivo = leer_archivo_fuente(directorio, nombre)
        textos[nombre] = contenido
        nombres[nombre] = archivo
    return textos, nombres
