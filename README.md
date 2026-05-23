# Proyecto estadística — calculadora + análisis de corpus

Aplicación con **frontend React (Vite)** y **API FastAPI** para estadística descriptiva/inferencial y análisis de corpus (tabla de contingencia, Bayes, red bayesiana, Markov).

**Instrucciones para quien ejecuta el proyecto por primera vez** (evaluación, despliegue o revisión): sigue este README en orden. Necesitas **dos terminales** abiertas a la vez (backend + frontend).

---

## Requisitos previos (instalar una sola vez en el equipo)

| Herramienta | Versión mínima | Comprobar en terminal |
|-------------|----------------|------------------------|
| **Python** | 3.9+ | `python --version` o `python3 --version` |
| **Node.js** | 18+ | `node --version` |
| **npm** | (viene con Node) | `npm --version` |

En Windows, si `python` no funciona, prueba `py --version` y usa `py` en lugar de `python` en los comandos de abajo.

---

## Estructura del repositorio

```
calculadora-estadistica/     ← raíz del repo en GitHub
├── README.md
├── .gitignore
├── backend/                 # API FastAPI (puerto 8000)
│   ├── main.py
│   ├── requirements.txt
│   └── data/corpus/         # textos de ejemplo
└── calculadora-estadistica/ # Frontend React + Vite (puerto 5173)
    ├── package.json
    └── src/
```

---

## Importante: qué NO viene en GitHub

Al clonar el repositorio **no** encontrarás estas carpetas (es normal; no faltan archivos):

| Carpeta | Motivo |
|---------|--------|
| `backend/venv/` | Entorno virtual de Python — **cada persona lo crea en su PC** |
| `calculadora-estadistica/node_modules/` | Dependencias de Node — se generan con `npm install` |

Debes completar la **instalación primera vez** (siguiente sección) antes de poder iniciar la aplicación.

---

## Instalación — primera vez (obligatoria)

Haz estos pasos **una sola vez** después de clonar el repo. Elige la sección de tu sistema operativo.

### A) Backend — Windows (PowerShell o CMD)

Abre una terminal en la carpeta raíz del proyecto clonado:

```powershell
cd backend
python -m venv venv
```

Activa el entorno virtual:

```powershell
# PowerShell
.\venv\Scripts\Activate.ps1
```

Si PowerShell muestra error de permisos al activar, ejecuta una vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Luego vuelve a activar: `.\venv\Scripts\Activate.ps1`

En **CMD** (símbolo del sistema), en lugar de lo anterior:

```cmd
venv\Scripts\activate.bat
```

Con el entorno activado (verás `(venv)` al inicio de la línea), instala dependencias:

```powershell
pip install -r requirements.txt
```

Comprueba que la API arranca (prueba rápida; puedes detenerla con `Ctrl+C` después):

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Abre en el navegador: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) — si ves la documentación de FastAPI, el backend está bien.

---

### B) Backend — macOS / Linux

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Comprueba: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) — detén con `Ctrl+C` si solo era prueba.

---

### C) Frontend — Windows, macOS y Linux (igual en todos)

En **otra terminal nueva**, desde la raíz del proyecto:

```bash
cd calculadora-estadistica
npm install
```

Comprueba (opcional; detén con `Ctrl+C`):

```bash
npm run dev
```

Debe mostrar una URL local, por ejemplo `http://localhost:5173/`.

---

## Iniciar el proyecto (cada vez que lo uses)

Tras la instalación primera vez, para trabajar con la app necesitas **dos terminales** al mismo tiempo.

### Terminal 1 — Backend (API)

**Windows** (con venv ya creado):

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**macOS / Linux:**

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Salida esperada:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

Deja esta terminal **abierta**.

---

### Terminal 2 — Frontend (React)

```bash
cd calculadora-estadistica
npm run dev
```

Salida esperada:

```
VITE v8.x.x  ready in ...
➜  Local:   http://localhost:5173/
```

Abre en el navegador: [http://localhost:5173/](http://localhost:5173/)

Deja esta terminal **abierta**.

---

## Configuración de la API (opcional)

El frontend llama por defecto a `http://127.0.0.1:8000`. Si el backend usa otro host o puerto, crea `calculadora-estadistica/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Reinicia `npm run dev` después de cambiar el `.env`.

---

## Uso de la aplicación

1. Mantén **backend y frontend** en ejecución (dos terminales).
2. Pestaña **análisis de corpus**: opción **«Usar corpus del servidor»** (archivos en `backend/data/corpus/`) y luego **Analizar**.
3. La **calculadora estadística** usa los endpoints bajo `/api/...`.

Si la interfaz carga pero los cálculos fallan, revisa que la Terminal 1 (backend) siga activa y que [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) abra correctamente.

---

## Detener el proyecto

En cada terminal: `Ctrl + C`

---

## Producción (opcional)

```bash
# Backend (con venv activado)
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend — build estático
cd calculadora-estadistica
npm run build
npm run preview
```

---

## Problemas frecuentes

| Problema | Qué hacer |
|----------|-----------|
| `python` no reconocido (Windows) | Instala Python desde [python.org](https://www.python.org/downloads/) marcando **“Add Python to PATH”**, o usa `py` en los comandos. |
| No se activa el venv en PowerShell | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y luego `.\venv\Scripts\Activate.ps1` |
| La web abre pero no calcula / error de red | El backend no está corriendo: inicia Terminal 1 y revisa [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |
| `npm` no reconocido | Instala Node.js 18+ desde [nodejs.org](https://nodejs.org/) |
| Puerto 8000 o 5173 ocupado | Cierra otras apps que usen ese puerto o cambia el puerto en el comando |

---

## Resumen rápido (primera vez)

1. Clonar el repositorio.
2. **Backend:** `cd backend` → crear `venv` → activarlo → `pip install -r requirements.txt`
3. **Frontend:** `cd calculadora-estadistica` → `npm install`
4. **Usar:** Terminal 1 `uvicorn ...` + Terminal 2 `npm run dev` → abrir [http://localhost:5173/](http://localhost:5173/)
