import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

/**
 * Combobox personalizado (mismo estilo que «Método de muestreo» en la calculadora).
 */
export default function SelectorCombo({
  id,
  value,
  onChange,
  opciones = [],
  placeholder = '— Selecciona —',
  opcional = true,
}) {
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
      {opcional ? (
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
      ) : null}
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
