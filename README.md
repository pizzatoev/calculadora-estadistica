# Proyecto estadística — calculadora + análisis de corpus

Aplicación con **frontend React (Vite)** y **API FastAPI** para estadística descriptiva/inferencial y análisis de corpus (tabla de contingencia, Bayes, red bayesiana, Markov).

## Requisitos

- **Node.js** 18+ (para el frontend)
- **Python** 3.9+ (para el backend)
- Entorno virtual del backend ya creado en `backend/venv` (o `backend/.venv`)

## Estructura

```
proyecto_estadistica/
├── backend/                 # API FastAPI (puerto 8000)
│   ├── main.py
│   ├── venv/                # entorno Python
│   └── data/corpus/         # textos de ejemplo (humano, copilot, etc.)
└── calculadora-estadistica/ # Frontend React + Vite (puerto 5173)
```

## Cómo iniciar el proyecto (desarrollo)

Desde la carpeta raíz `proyecto_estadistica/`, abre **dos terminales**: primero el backend, luego el frontend.

### Terminal 1 — Backend (API)

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Si tu entorno está en `.venv` en lugar de `venv`:

```bash
source .venv/bin/activate
```

Cuando arranque bien verás algo como:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

Comprueba la API en el navegador: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Terminal 2 — Frontend (React)

```bash
cd calculadora-estadistica
npm install   # solo la primera vez o si cambiaste dependencias
npm run dev
```

Salida esperada:

```
VITE v8.x.x  ready in ...
➜  Local:   http://localhost:5173/
```

Abre en el navegador: [http://localhost:5173/](http://localhost:5173/)

El frontend llama por defecto a la API en `http://127.0.0.1:8000`. Si usas otro host/puerto, crea un archivo `.env` en `calculadora-estadistica/`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## Uso rápido

1. Deja **ambas terminales** en ejecución (backend + `npm run dev`).
2. En la app, pestaña de **análisis de corpus**: puedes usar **«Usar corpus del servidor»** (archivos en `backend/data/corpus/`) y luego **Analizar**.
3. La calculadora estadística usa los mismos endpoints bajo `/api/...`.

## Primera instalación (si aún no tienes dependencias)

**Frontend:**

```bash
cd calculadora-estadistica
npm install
```

**Backend** (ejemplo con `venv`):

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn numpy scipy nltk
```

(Ajusta el `pip install` si en tu máquina ya tienes más paquetes en el entorno.)

## Detener

- En cada terminal: `Ctrl + C`

## Producción (opcional)

```bash
# Backend sin recarga
uvicorn main:app --host 0.0.0.0 --port 8000

# Build del frontend
cd calculadora-estadistica
npm run build
npm run preview
```
