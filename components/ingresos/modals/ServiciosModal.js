'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { SERVICIOS_CATALOGO, getServicioLabel } from '@/lib/config'
import { formatCurrency, parseCurrency, formatInputNumber } from '@/lib/utils'

export default function ServiciosModal({ isOpen, onClose, onSave, type = 'tarjeta', initialData = {} }) {
  // initialData structure: { "Service Name": { lote: "...", monto: 0, tarjeta: 0 } }
  const [services, setServices] = useState({})
  const [newServiceName, setNewServiceName] = useState('')

  useEffect(() => {
    if (isOpen) {
      const newServices = {}
      
      SERVICIOS_CATALOGO.forEach(({ key, label }) => {
        const data = initialData[key] || initialData[label] || {}
        newServices[key] = {
          lote: data?.lote || '',
          monto: data?.monto || 0,
          tarjeta: data?.tarjeta || 0
        }
      })
      
      Object.keys(initialData || {}).forEach(name => {
        const isCatalogKey = SERVICIOS_CATALOGO.some(s => s.key === name)
        const isCatalogLabel = SERVICIOS_CATALOGO.some(s => s.label === name)
        if (!isCatalogKey && !isCatalogLabel && !newServices[name]) {
          newServices[name] = { ...initialData[name] }
        }
      })

      setServices(newServices)
      setNewServiceName('')
    }
  }, [isOpen, initialData])

  const handleChange = (name, field, value) => {
    setServices(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        [field]: value
      }
    }))
  }

  const handleAmountChange = (name, field, value) => {
    const numericValue = parseCurrency(value)
    handleChange(name, field, numericValue)
  }

  const handleAddService = () => {
    const name = newServiceName.trim()
    if (!name) return

    setServices(prev => {
      if (prev[name]) return prev
      return {
        ...prev,
        [name]: { lote: '', monto: 0, tarjeta: 0 }
      }
    })

    setNewServiceName('')
  }

  const handleSave = () => {
    onSave(services)
    onClose()
  }

  const orderedKeys = [
    ...SERVICIOS_CATALOGO.map(s => s.key),
    ...Object.keys(services).filter(k => !SERVICIOS_CATALOGO.some(s => s.key === k))
  ].filter(k => services[k])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Servicios (Efectivo y Tarjeta)">
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Ref/Lote</th>
                <th className="px-4 py-3 text-right">Efectivo (Gs)</th>
                <th className="px-4 py-3 text-right">Tarjeta (Gs)</th>
              </tr>
            </thead>
            <tbody>
              {orderedKeys.map((name) => (
                <tr key={name} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{getServicioLabel(name)}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      value={services[name]?.lote || ''}
                      onChange={(e) => handleChange(name, 'lote', e.target.value)}
                      placeholder="Ref/Lote"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                     <div className="relative rounded-md shadow-sm">
                        <input
                          type="text"
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:ring-blue-500 focus:border-blue-500"
                          value={formatInputNumber(services[name]?.monto)}
                          onChange={(e) => handleAmountChange(name, 'monto', e.target.value)}
                          placeholder="0"
                        />
                     </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                     <div className="relative rounded-md shadow-sm">
                        <input
                          type="text"
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:ring-blue-500 focus:border-blue-500"
                          value={formatInputNumber(services[name]?.tarjeta)}
                          onChange={(e) => handleAmountChange(name, 'tarjeta', e.target.value)}
                          placeholder="0"
                        />
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nuevo Servicio</label>
            <input
              type="text"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddService()
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Servicio X"
            />
          </div>
          <button
            onClick={handleAddService}
            className="px-4 py-2 text-white bg-gray-800 rounded-lg hover:bg-gray-900"
          >
            Agregar
          </button>
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
