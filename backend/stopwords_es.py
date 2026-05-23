"""Stopwords en español (normalizadas sin tildes, alineadas con text_analysis.normalizar_texto)."""
from __future__ import annotations

import os
import unicodedata
from functools import lru_cache
from pathlib import Path

# Lista fija equivalente a nltk.corpus.stopwords.words('spanish') tras normalizar
_STOPWORDS_ES_FIJAS: frozenset[str] = frozenset({
    "a", "al", "algo", "algunas", "algunos", "ante", "antes", "como", "con", "contra",
    "cual", "cuando", "de", "del", "desde", "donde", "durante", "e", "el", "ella",
    "ellas", "ellos", "en", "entre", "era", "erais", "eramos", "eran", "eras", "eres",
    "es", "esa", "esas", "ese", "eso", "esos", "esta", "estaba", "estabais", "estabamos",
    "estaban", "estabas", "estad", "estada", "estadas", "estado", "estados", "estais",
    "estamos", "estan", "estando", "estar", "estara", "estaran", "estaras", "estare",
    "estareis", "estaremos", "estaria", "estariais", "estariamos", "estarian", "estarias",
    "estas", "este", "esteis", "estemos", "esten", "estes", "esto", "estos", "estoy",
    "estuve", "estuviera", "estuvierais", "estuvieramos", "estuvieran", "estuvieras",
    "estuvieron", "estuviese", "estuvieseis", "estuviesemos", "estuviesen", "estuvieses",
    "estuvimos", "estuviste", "estuvisteis", "estuvo", "fue", "fuera", "fuerais",
    "fueramos", "fueran", "fueras", "fueron", "fuese", "fueseis", "fuesemos", "fuesen",
    "fueses", "fui", "fuimos", "fuiste", "fuisteis", "ha", "habeis", "habia", "habiais",
    "habiamos", "habian", "habias", "habida", "habidas", "habido", "habidos", "habiendo",
    "habra", "habran", "habras", "habre", "habreis", "habremos", "habria", "habriais",
    "habriamos", "habrian", "habrias", "han", "has", "hasta", "hay", "haya", "hayais",
    "hayamos", "hayan", "hayas", "he", "hemos", "hube", "hubiera", "hubierais",
    "hubieramos", "hubieran", "hubieras", "hubieron", "hubiese", "hubieseis",
    "hubiesemos", "hubiesen", "hubieses", "hubimos", "hubiste", "hubisteis", "hubo",
    "la", "las", "le", "les", "lo", "los", "mas", "me", "mi", "mia", "mias", "mio",
    "mios", "mis", "mucho", "muchos", "muy", "nada", "ni", "no", "nos", "nosotras",
    "nosotros", "nuestra", "nuestras", "nuestro", "nuestros", "o", "os", "otra", "otras",
    "otro", "otros", "para", "pero", "poco", "por", "porque", "que", "quien", "quienes",
    "se", "sea", "seais", "seamos", "sean", "seas", "sentid", "sentida", "sentidas",
    "sentido", "sentidos", "sera", "seran", "seras", "sere", "sereis", "seremos", "seria",
    "seriais", "seriamos", "serian", "serias", "si", "siente", "sin", "sintiendo", "sobre",
    "sois", "somos", "son", "soy", "su", "sus", "suya", "suyas", "suyo", "suyos",
    "tambien", "tanto", "te", "tendra", "tendran", "tendras", "tendre", "tendreis",
    "tendremos", "tendria", "tendriais", "tendriamos", "tendrian", "tendrias", "tened",
    "teneis", "tenemos", "tenga", "tengais", "tengamos", "tengan", "tengas", "tengo",
    "tenia", "teniais", "teniamos", "tenian", "tenias", "tenida", "tenidas", "tenido",
    "tenidos", "teniendo", "ti", "tiene", "tienen", "tienes", "todo", "todos", "tu",
    "tus", "tuve", "tuviera", "tuvierais", "tuvieramos", "tuvieran", "tuvieras",
    "tuvieron", "tuviese", "tuvieseis", "tuviesemos", "tuviesen", "tuvieses", "tuvimos",
    "tuviste", "tuvisteis", "tuvo", "tuya", "tuyas", "tuyo", "tuyos", "un", "una", "uno",
    "unos", "vosotras", "vosotros", "vuestra", "vuestras", "vuestro", "vuestros", "y",
    "ya", "yo",
})


def _normalizar_palabra_stopword(palabra: str) -> str:
    t = palabra.lower().strip()
    t = unicodedata.normalize("NFKD", t)
    return "".join(c for c in t if not unicodedata.combining(c))


def _stopwords_desde_nltk() -> frozenset[str] | None:
    try:
        import nltk
        from nltk.corpus import stopwords

        data_dir = Path(__file__).resolve().parent / ".nltk_data"
        if data_dir.is_dir():
            os.environ.setdefault("NLTK_DATA", str(data_dir))
        try:
            palabras = stopwords.words("spanish")
        except LookupError:
            nltk.download("stopwords", quiet=True, download_dir=str(data_dir))
            palabras = stopwords.words("spanish")
        return frozenset(
            _normalizar_palabra_stopword(w)
            for w in palabras
            if w and w.isalpha()
        )
    except Exception:
        return None


@lru_cache(maxsize=1)
def obtener_stopwords_es() -> frozenset[str]:
    """Stopwords en español; intenta NLTK y usa lista fija como respaldo."""
    desde_nltk = _stopwords_desde_nltk()
    if desde_nltk:
        return desde_nltk
    return _STOPWORDS_ES_FIJAS


def es_stopword(palabra: str) -> bool:
    return _normalizar_palabra_stopword(palabra) in obtener_stopwords_es()
