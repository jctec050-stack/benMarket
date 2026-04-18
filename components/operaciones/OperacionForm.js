'use client'

import { useState, useEffect } from 'react'
import { parseCurrency, formatInputNumber } from '@/lib/utils'
import { useNotifications } from '@/context/NotificationContext'

export default function OperacionForm({ onSubmit, nextReceiptNumber }) {
  const { error: notifyError, warning } = useNotifications()
  const [formData, setFormData] = useState({
    fecha: (() => {
      const now = new Date()
      const tzOffsetMs = now.getTimezoneOffset() * 60000
      return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10)
    })(),
    tipo: 'gasto',
    receptor: '',
    descripcion: '',
    monto: '',
    moneda: 'gs',
    referencia: '',
    numeroRecibo: ''
  })

  useEffect(() => {
    if (nextReceiptNumber && formData.tipo === 'operacion') {
      setFormData(prev => ({ ...prev, numeroRecibo: nextReceiptNumber }))
    }
  }, [nextReceiptNumber, formData.tipo])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleMontoChange = (e) => {
    const value = e.target.value
    // Store only numeric/decimal parts for state, but we can store the formatted string if we want or parse it
    const numericValue = parseCurrency(value)
    setFormData(prev => ({ ...prev, monto: numericValue }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.fecha || !formData.tipo || !formData.descripcion || !formData.monto || !formData.moneda) {
      notifyError('Campos Incompletos', 'Por favor complete todos los campos obligatorios')
      return
    }

    const montoNum = parseCurrency(formData.monto)
    if (montoNum <= 0) {
      warning('Monto Inválido', 'El monto de la operación debe ser mayor a 0')
      return
    }

    // Adjust sign: everything is negative except investments
    const finalMonto = formData.tipo === 'deposito-inversiones' ? Math.abs(montoNum) : -Math.abs(montoNum)

    const [yyyy, mm, dd] = String(formData.fecha).split('-').map(v => parseInt(v, 10))
    const now = new Date()
    const fechaLocal = new Date(yyyy, (mm || 1) - 1, dd || 1, now.getHours(), now.getMinutes(), now.getSeconds())

    const operacion = {
      fecha: fechaLocal.toISOString(),
      tipo: formData.tipo,
      receptor: formData.receptor || null,
      descripcion: formData.descripcion,
      monto: finalMonto,
      moneda: formData.moneda,
      referencia: formData.referencia || null,
      numeroRecibo: formData.tipo === 'operacion' ? formData.numeroRecibo : null,
      arqueado: false
    }

    onSubmit(operacion)

    // Reset form
    setFormData(prev => ({
      ...prev,
      tipo: 'gasto',
      receptor: '',
      descripcion: '',
      monto: '',
      referencia: '',
      numeroRecibo: prev.tipo === 'operacion' ? (parseInt(prev.numeroRecibo) || 0) + 1 : ''
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-xl font-bold text-gray-800 border-b-2 border-gray-800 pb-2 mb-6">
        Registrar Operación / Gasto
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Fecha */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            📅 Fecha
          </label>
          <input
            type="date"
            name="fecha"
            required
            className="w-full md:w-64 px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-gray-500 focus:border-gray-500"
            value={formData.fecha}
            onChange={handleChange}
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Movimiento
          </label>
          <select
            name="tipo"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
            value={formData.tipo}
            onChange={handleChange}
          >
            <option value="gasto">Gasto General</option>
            <option value="egreso">Pago a Proveedor</option>
            <option value="transferencia">Transferencia entre Cajas</option>
            <option value="operacion">Depósito/Retiro Bancario</option>
            <option value="deposito-inversiones">Deposito - Inversiones</option>
          </select>
        </div>

        {/* Receptor (Conditional could be added here, but simpler to always show or hide based on type logic if needed. Legacy shows it conditionally but logic was messy. Let's show it always for clarity or strictly follow legacy?) 
           Legacy: id="receptor-gasto-container" style="display: none;" 
           It seems it was hidden by default and maybe shown by some JS? 
           I'll keep it visible if it has value or maybe just always visible as optional.
           Let's make it conditional on 'transferencia' or 'egreso' just in case.
        */}
        {(formData.tipo === 'transferencia' || formData.tipo === 'egreso' || formData.tipo === 'operacion') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.tipo === 'operacion' ? '🏦 Entregado a / Recibido por' : 'Recibido por (Opcional)'}
              </label>
              <input
                type="text"
                name="receptor"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
                placeholder="Nombre de quien recibe"
                value={formData.receptor}
                onChange={handleChange}
              />
            </div>

            {formData.tipo === 'operacion' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🎫 # Recibo de Dinero
                </label>
                <input
                  type="number"
                  name="numeroRecibo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-bold"
                  value={formData.numeroRecibo}
                  onChange={handleChange}
                  placeholder="Ej: 1001"
                />
              </div>
            )}
          </div>
        )}

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <input
            type="text"
            name="descripcion"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
            placeholder="Descripción detallada"
            value={formData.descripcion}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto
            </label>
            <input
              type="text"
              name="monto"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
              placeholder="0"
              value={formatInputNumber(formData.monto, formData.moneda !== 'gs')}
              onChange={handleMontoChange}
            />
          </div>

          {/* Moneda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Moneda
            </label>
            <select
              name="moneda"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
              value={formData.moneda}
              onChange={handleChange}
            >
              <option value="gs">Guaraníes (PYG)</option>
              <option value="usd">Dólares (USD)</option>
              <option value="brl">Reales (BRL)</option>
              <option value="ars">Pesos (ARS)</option>
            </select>
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia (Op)
            </label>
            <input
              type="text"
              name="referencia"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
              placeholder="Factura, etc."
              value={formData.referencia}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            className="px-6 py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 shadow-md transition-transform transform hover:scale-105"
          >
            Guardar Movimiento
          </button>
        </div>
      </form>
    </div>
  )
}
