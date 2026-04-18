'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { formatCurrency, parseCurrency, formatInputNumber } from '@/lib/utils'

export default function NoEfectivoModal({ isOpen, onClose, onSave, initialData = {} }) {
  const [formData, setFormData] = useState({
    pagosTarjeta: 0,
    pedidosYa: 0,
    ventasTransferencia: 0
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        pagosTarjeta: initialData.pagosTarjeta || 0,
        pedidosYa: initialData.pedidosYa || 0,
        ventasTransferencia: initialData.ventasTransferencia || initialData.ventas_transferencia || 0
      })
    }
  }, [isOpen, initialData])

  const handleChange = (e) => {
    const { name, value } = e.target
    // Allow empty string for better UX while typing
    if (value === '') {
      setFormData(prev => ({ ...prev, [name]: '' }))
      return
    }
    
    // Parse numeric value
    const numericValue = parseCurrency(value)
    setFormData(prev => ({ ...prev, [name]: numericValue }))
  }

  const handleSave = () => {
    onSave({
      pagosTarjeta: Number(formData.pagosTarjeta) || 0,
      pedidosYa: Number(formData.pedidosYa) || 0,
      ventasTransferencia: Number(formData.ventasTransferencia) || 0
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ingresos No Efectivo">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          
          {/* Pagos con Tarjeta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pagos con Tarjeta (POS)
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">Gs</span>
              </div>
              <input
                type="text"
                name="pagosTarjeta"
                value={formatInputNumber(formData.pagosTarjeta)}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2"
                placeholder="0"
              />
            </div>
          </div>

          {/* Pedidos YA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pedidos YA
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">Gs</span>
              </div>
              <input
                type="text"
                name="pedidosYa"
                value={formatInputNumber(formData.pedidosYa)}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2"
                placeholder="0"
              />
            </div>
          </div>

          {/* Ventas Transferencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ventas a Transferencia
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">Gs</span>
              </div>
              <input
                type="text"
                name="ventasTransferencia"
                value={formatInputNumber(formData.ventasTransferencia)}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2"
                placeholder="0"
              />
            </div>
          </div>

        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  )
}
