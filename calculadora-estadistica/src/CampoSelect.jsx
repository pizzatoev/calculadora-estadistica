import SelectorCombo from './SelectorCombo.jsx'

/** Select con etiqueta (estilo «Método de muestreo»). */
export default function CampoSelect({
  id,
  label,
  value,
  onChange,
  opciones,
  className = '',
  opcional = false,
  placeholder,
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[#E97F4A]">
        {label}
      </label>
      <SelectorCombo
        id={id}
        value={value}
        onChange={onChange}
        opciones={opciones}
        placeholder={placeholder ?? `— Selecciona —`}
        opcional={opcional}
      />
    </div>
  )
}
