'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { CONFIG } from '@/lib/config'
import { formatCurrency, parseCurrency, formatInputNumber } from '@/lib/utils'

export default function EfectivoModal({ isOpen, onClose, onSave, initialData = {}, initialMonedasExtranjeras = {}, cotizaciones = {} }) {
  const [counts, setCounts] = useState({})
  const [monedas, setMonedas] = useState({
    usd: { cantidad: 0, cotizacion: cotizaciones.usd || 0 },
    brl: { cantidad: 0, cotizacion: cotizaciones.brl || 0 },
    ars: { cantidad: 0, cotizacion: cotizaciones.ars || 0 }
  })
  const [totalBilletes, setTotalBilletes] = useState(0)
  const [totalMonedasGs, setTotalMonedasGs] = useState(0)
  const [totalGeneral, setTotalGeneral] = useState(0)

  // Initialize counts from props or zero
  useEffect(() => {
    if (isOpen) {
      const newCounts = {}
      CONFIG.denominaciones.forEach(d => {
        newCounts[d.valor] = initialData[d.valor] || 0
      })
      setCounts(newCounts)

      setMonedas({
        usd: {
          cantidad: initialMonedasExtranjeras?.usd?.cantidad || 0,
          cotizacion: cotizaciones.usd || initialMonedasExtranjeras?.usd?.cotizacion || 0
        },
        brl: {
          cantidad: initialMonedasExtranjeras?.brl?.cantidad || 0,
          cotizacion: cotizaciones.brl || initialMonedasExtranjeras?.brl?.cotizacion || 0
        },
        ars: {
          cantidad: initialMonedasExtranjeras?.ars?.cantidad || 0,
          cotizacion: cotizaciones.ars || initialMonedasExtranjeras?.ars?.cotizacion || 0
        }
      })
    }
  }, [isOpen, initialData, initialMonedasExtranjeras, cotizaciones])

  // Calculate total whenever counts change
  useEffect(() => {
    let newTotal = 0
    Object.entries(counts).forEach(([valor, cantidad]) => {
      newTotal += parseInt(valor) * (parseInt(cantidad) || 0)
    })
    setTotalBilletes(newTotal)
  }, [counts])

  useEffect(() => {
    const monedasTotal = Object.values(monedas).reduce((acc, m) => {
      const cant = parseFloat(m.cantidad) || 0
      const cot = parseFloat(m.cotizacion) || 0
      return acc + (cant * cot)
    }, 0)

    setTotalMonedasGs(monedasTotal)
    setTotalGeneral(totalBilletes + monedasTotal)
  }, [monedas, totalBilletes])

  const handleChange = (valor, value) => {
    const intValue = parseInt(value) || 0
    setCounts(prev => ({
      ...prev,
      [valor]: intValue
    }))
  }

  const handleMonedaChange = (moneda, field, value) => {
    const parsed = field === 'cantidad' ? (parseFloat(value) || 0) : (parseFloat(value) || 0)
    setMonedas(prev => ({
      ...prev,
      [moneda]: {
        ...prev[moneda],
        [field]: parsed
      }
    }))
  }

  const handleSave = () => {
    // Filter out zero counts to keep it clean, or keep all? 
    // Legacy kept only > 0.
    const cleanCounts = {}
    Object.entries(counts).forEach(([valor, cantidad]) => {
      if (cantidad > 0) cleanCounts[valor] = cantidad
    })

    const cleanMonedas = {}
    Object.entries(monedas).forEach(([k, v]) => {
      const cantidad = parseFloat(v.cantidad) || 0
      const cotizacion = parseFloat(v.cotizacion) || 0
      if (cantidad > 0 && cotizacion > 0) {
        cleanMonedas[k] = { cantidad, cotizacion }
      }
    })

    onSave({ efectivo: cleanCounts, monedasExtranjeras: cleanMonedas }, totalGeneral)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conteo de Efectivo">
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Denominación</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {CONFIG.denominaciones.map((denom) => (
                <tr key={denom.valor} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{denom.nombre}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      value={counts[denom.valor] || ''}
                      onChange={(e) => handleChange(denom.valor, e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {formatCurrency(denom.valor * (counts[denom.valor] || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 font-bold text-blue-900">
                <td colSpan="2" className="px-4 py-3 text-right">Total Efectivo:</td>
                <td className="px-4 py-3 text-right">{formatCurrency(totalBilletes)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs font-bold text-gray-500 uppercase mb-3">Monedas Extranjeras</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'usd', label: 'USD', placeholder: '0' },
              { key: 'brl', label: 'BRL', placeholder: '0' },
              { key: 'ars', label: 'ARS', placeholder: '0' }
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-800">{label}</div>
                  <div className="text-xs text-gray-500">Cotiz: {formatCurrency(monedas[key]?.cotizacion || 0)}</div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formatInputNumber(monedas[key]?.cantidad, true)}
                    onChange={(e) => handleMonedaChange(key, 'cantidad', e.target.value)}
                    placeholder={placeholder}
                    onFocus={(e) => e.target.select()}
                  />
                  <div className="text-xs text-gray-500 flex-1 text-right">
                    {formatCurrency((parseFloat(monedas[key]?.cantidad) || 0) * (parseFloat(monedas[key]?.cotizacion) || 0))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-gray-600">Total Monedas (Gs):</span>
            <span className="font-bold text-gray-900">{formatCurrency(totalMonedasGs)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-gray-600">Total Efectivo (Billetes):</span>
            <span className="font-bold text-gray-900">{formatCurrency(totalBilletes)}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-bold border-t border-gray-200 pt-2">
            <span className="text-gray-900">Total General (Gs):</span>
            <span className="text-blue-700">{formatCurrency(totalGeneral)}</span>
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
            Guardar Efectivo
          </button>
        </div>
      </div>
    </Modal>
  )
}
