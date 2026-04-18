import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

export function Button({ 
  children, 
  variant = 'primary', 
  className, 
  isLoading, 
  disabled, 
  ...props 
}) {
  const baseStyles = "btn"
  
  const variants = {
    primary: "btn-primario",
    secondary: "btn-secundario",
    excel: "btn-excel",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-md",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 border border-gray-200"
  }

  return (
    <button 
      className={clsx(
        baseStyles, 
        variants[variant], 
        (isLoading || disabled) && "opacity-70 cursor-not-allowed",
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Input({ label, error, className, containerClassName, ...props }) {
  return (
    <div className={clsx("form-group", containerClassName)}>
      {label && <label className="form-label">{label}</label>}
      <input 
        className={clsx(
          "form-input",
          error && "border-red-500 focus:ring-red-200",
          className
        )} 
        {...props} 
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

export function Select({ label, options = [], error, className, containerClassName, ...props }) {
  return (
    <div className={clsx("form-group", containerClassName)}>
      {label && <label className="form-label">{label}</label>}
      <select 
        className={clsx(
          "form-input appearance-none bg-no-repeat bg-right pr-8",
          error && "border-red-500 focus:ring-red-200",
          className
        )} 
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
