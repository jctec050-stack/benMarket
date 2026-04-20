'use client'

import { useState, useEffect } from 'react'
import { parseCurrency, formatInputNumber } from '@/lib/utils'
import { db } from '@/lib/db'
import { useData } from '@/context/DataContext'
import { useNotifications } from '@/context/NotificationContext'
import { Box } from 'lucide-react'

export default function EgresoForm({ onSubmit, initialData = null, onCancelEdit }) {
  const { selectedCaja, selectedDate } = useData()
  const { error: notifyError } = useNotifications()
  
  const initialFormState = {
    fecha: selectedDate,
    categoria: '',
    descripcion: '',
    monto: '',
    referencia: '',
    numeroRecibo: '',
    receptor: ''
  }

  const [formData, setFormData] = useState(initialFormState)
  const [displayMonto, setDisplayMonto] = useState('')
  const [motivoEdicion, setMotivoEdicion] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleMontoChange = (e) => {
    const numericValue = parseCurrency(e.target.value)
    if (!e.target.value) {
      setDisplayMonto('')
      setFormData(prev => ({ ...prev, monto: '' }))
      return
    }
    setDisplayMonto(formatInputNumber(numericValue))
    setFormData(prev => ({ ...prev, monto: numericValue }))
  }

  const handleLimpiar = () => {
    setFormData(initialFormState)
    setDisplayMonto('')
    setMotivoEdicion('')
    if (onCancelEdit) onCancelEdit()
  }

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        fecha: initialData.fecha.split('T')[0],
        categoria: initialData.categoria,
        descripcion: initialData.descripcion,
        monto: initialData.monto,
        referencia: initialData.referencia || '',
        numeroRecibo: initialData.numeroRecibo || '',
        receptor: initialData.receptor || ''
      })
      setDisplayMonto(formatInputNumber(initialData.monto))
      setMotivoEdicion('')
    } else {
      setFormData(initialFormState)
      setDisplayMonto('')
      setMotivoEdicion('')
    }
  }, [initialData])

  useEffect(() => {
    if (!initialData && formData.categoria === 'Retiro de Fondos') {
      const fetchReceipt = async () => {
        const next = await db.getNextReceiptNumber()
        setFormData(prev => ({ ...prev, numeroRecibo: String(next) }))
      }
      fetchReceipt()
    } else if (!initialData) {
      setFormData(prev => ({ ...prev, numeroRecibo: '' }))
    }
  }, [formData.categoria, initialData])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.fecha || !formData.categoria || !formData.descripcion || !formData.monto) {
      notifyError('Campos Incompletos', 'Por favor complete todos los campos obligatorios')
      return
    }

    const [yyyy, mm, dd] = String(selectedDate).split('-').map(v => parseInt(v, 10))
    const now = new Date()
    const fechaLocal = new Date(yyyy, (mm || 1) - 1, dd || 1, now.getHours(), now.getMinutes(), now.getSeconds())

    const egreso = {
      ...(formData.id ? { id: formData.id } : {}),
      fecha: fechaLocal.toISOString(),
      categoria: formData.categoria,
      descripcion: formData.descripcion,
      monto: formData.monto,
      referencia: formData.referencia,
      receptor: formData.receptor || null,
      numeroRecibo: formData.numeroRecibo || null,
      arqueado: false,
      motivoEdicion: motivoEdicion
    }

    onSubmit(egreso)
    handleLimpiar()
  }

  return (
    <div className="relative bg-white rounded-lg shadow-md p-8 pt-12 mb-8 border border-gray-100 max-w-5xl mx-auto">
      
      {/* Badge Caja (Top Right) */}
      <div className="absolute top-4 right-4 bg-[#c62828] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm">
        <Box size={18} />
        <span>Caja: {selectedCaja}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Categoría */}
        <div className="form-group grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Categoría:
            </label>
            <select
              name="categoria"
              required
              className="w-full px-4 py-2 border-2 border-[#c62828] rounded-lg focus:outline-none bg-white text-gray-800 appearance-none cursor-pointer"
              value={formData.categoria}
              onChange={handleChange}
            >
              <option value="">Seleccione una categoría</option>
              <option value="Pago a Proveedor">Pago a Proveedor</option>
              <option value="Gastos administrativos">Gastos administrativos</option>
              <option value="Transferencia entre cajas">Transferencia entre cajas</option>
              <option value="Cobros c/ tarjetas">Cobros c/ tarjetas</option>
              <option value="Cobros c/ transferencia">Cobros c/ transferencia</option>
              <option value="Retiro de Fondos">Retiro de Fondos</option>
            </select>
          </div>

          {/* Proveedor / Receptor (Condicional) */}
          {(formData.categoria === 'Pago a Proveedor' || formData.categoria === 'Retiro de Fondos') && (
            <div className="animate-fade-in">
              <label className="block text-sm font-bold text-gray-800 mb-2">
                {formData.categoria === 'Pago a Proveedor' ? 'Proveedor:' : 'Receptor:'}
              </label>
              <input
                type="text"
                name="receptor"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-red-500 focus:outline-none text-gray-700 bg-white"
                placeholder={formData.categoria === 'Pago a Proveedor' ? 'Nombre del proveedor' : 'Nombre del receptor'}
                value={formData.receptor || ''}
                onChange={handleChange}
              />
            </div>
          )}
        </div>

        {/* Descripción */}
        <div className="form-group">
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Descripción:
          </label>
          <input
            type="text"
            name="descripcion"
            required
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-red-500 focus:outline-none text-gray-700 bg-white placeholder-gray-300"
            placeholder="Descripción detallada del egreso"
            value={formData.descripcion}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Monto */}
          <div className="form-group">
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Monto (G$):
            </label>
            <input
              type="text"
              name="monto"
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-red-500 focus:outline-none text-gray-700 bg-white"
              placeholder=""
              value={displayMonto}
              onChange={handleMontoChange}
            />
          </div>

          {/* Referencia */}
          <div className="form-group">
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Referencia (opcional):
            </label>
            <input
              type="text"
              name="referencia"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-red-500 focus:outline-none text-gray-700 bg-white placeholder-gray-300"
              placeholder="Número de factura, recibo, etc."
              value={formData.referencia}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Motivo de Edición (Mandatory) */}
        {initialData?.id && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 animate-pulse-subtle">
            <label className="block text-sm font-bold text-yellow-800 mb-2">
              Motivo de la Edición <span className="text-red-500">* (Obligatorio)</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 text-sm"
              rows="2"
              placeholder="Ej: Corrección de monto por error de carga..."
              value={motivoEdicion}
              onChange={(e) => setMotivoEdicion(e.target.value)}
              required
            ></textarea>
            <p className="text-[10px] text-yellow-700 mt-1 font-medium">
              Este motivo quedará registrado en el historial de auditoría para fines de control interno.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={initialData?.id && !motivoEdicion.trim()}
            className={`px-8 py-3 font-bold rounded-lg transition-all shadow-sm ${
                initialData?.id && !motivoEdicion.trim() 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-[#c62828] text-white hover:bg-red-800'
            }`}
          >
            {initialData?.id ? 'Guardar Cambios' : 'Guardar Egreso'}
          </button>
          <button
            type="button"
            onClick={handleLimpiar}
            className="px-8 py-3 bg-white border-2 border-[#c62828] text-[#c62828] font-bold rounded-lg hover:bg-red-50 transition-colors"
          >
            {initialData?.id ? 'Cancelar' : 'Limpiar'}
          </button>
        </div>
      </form>
    </div>
  )
}
