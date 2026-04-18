'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { formatCurrency, parseCurrency, formatInputNumber } from '@/lib/utils'

export default function CreditoModal({ isOpen, onClose, onSave, initialData = {} }) {
  const [formData, setFormData] = useState({
    cliente: '',
    descripcion: '',
    monto: 0
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        cliente: initialData.cliente || '',
        descripcion: initialData.descripcion || '',
        monto: initialData.monto || 0
      })
    }
  }, [isOpen, initialData])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'monto') {
      if (value === '') {
        setFormData(prev => ({ ...prev, [name]: '' }))
        return
      }
      const numericValue = parseCurrency(value)
      setFormData(prev => ({ ...prev, [name]: numericValue }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSave = () => {
    onSave({
      cliente: formData.cliente,
      descripcion: formData.descripcion,
      monto: Number(formData.monto) || 0
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ventas a Crédito">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <input
              type="text"
              name="cliente"
              value={formData.cliente}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
              placeholder="Nombre del cliente"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
              placeholder="Detalle de la venta"
            />
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto (Gs)
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">Gs</span>
              </div>
              <input
                type="text"
                name="monto"
                value={formatInputNumber(formData.monto)}
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
