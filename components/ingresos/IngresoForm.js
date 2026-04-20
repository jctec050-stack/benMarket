'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, parseCurrency, formatInputNumber } from '@/lib/utils'
import { useData } from '@/context/DataContext'
import EfectivoModal from './modals/EfectivoModal'
import NoEfectivoModal from './modals/NoEfectivoModal'
import ServiciosModal from './modals/ServiciosModal'
import CreditoModal from './modals/CreditoModal'

export default function IngresoForm({ onSubmit, initialData = null, onCancelEdit }) {
  const { cotizaciones: globalCotizaciones, updateGlobalCotizaciones, selectedDate } = useData()

  // --- Date Handling ---
  const [fecha, setFecha] = useState(selectedDate)

  useEffect(() => {
    if (initialData?.fecha) {
      setFecha(initialData.fecha.split('T')[0])
    } else {
      setFecha(selectedDate)
    }
  }, [initialData, selectedDate])

  // Main form state
  const [cotizaciones, setCotizaciones] = useState({
    usd: globalCotizaciones?.usd || 7000,
    brl: globalCotizaciones?.brl || 1250,
    ars: globalCotizaciones?.ars || 0
  })

  // Sub-data states
  const [efectivo, setEfectivo] = useState({})
  const [totalEfectivo, setTotalEfectivo] = useState(0)
  const [monedasExtranjeras, setMonedasExtranjeras] = useState({
    usd: { cantidad: 0, cotizacion: globalCotizaciones?.usd || 7000 },
    brl: { cantidad: 0, cotizacion: globalCotizaciones?.brl || 1250 },
    ars: { cantidad: 0, cotizacion: globalCotizaciones?.ars || 0 }
  })
  
  const [noEfectivo, setNoEfectivo] = useState({
    pagosTarjeta: 0,
    pedidosYa: 0,
    ventasTransferencia: 0
  })

  const [servicios, setServicios] = useState({}) // Shared state for services
  
  const [credito, setCredito] = useState({
    cliente: '',
    descripcion: '',
    monto: 0
  })

  // Modal visibility states
  const [modals, setModals] = useState({
    efectivo: false,
    noEfectivo: false,
    serviciosTarjeta: false,
    serviciosEfectivo: false,
    credito: false
  })
  
  const [motivoEdicion, setMotivoEdicion] = useState('')

  const computeTotalEfectivo = (efectivoCounts, monedasData) => {
    let totalBilletesCalc = 0
    Object.entries(efectivoCounts || {}).forEach(([denom, count]) => {
      totalBilletesCalc += parseInt(denom) * (parseInt(count) || 0)
    })

    const monedasCalc = monedasData || {}
    const totalMonedasCalc = ['usd', 'brl', 'ars'].reduce((acc, k) => {
      const cantidad = parseFloat(monedasCalc?.[k]?.cantidad) || 0
      const cotizacion = parseFloat(monedasCalc?.[k]?.cotizacion) || 0
      return acc + (cantidad * cotizacion)
    }, 0)

    return totalBilletesCalc + totalMonedasCalc
  }

  useEffect(() => {
    if (initialData) {
      setCotizaciones(initialData.cotizaciones || globalCotizaciones || { usd: 7000, brl: 1250, ars: 0 })

      const efectivoInit = initialData.efectivo || {}
      const monedasInit =
        initialData.monedasExtranjeras ||
        initialData.monedas_extranjeras ||
        { 
          usd: { cantidad: 0, cotizacion: globalCotizaciones?.usd || 7000 }, 
          brl: { cantidad: 0, cotizacion: globalCotizaciones?.brl || 1250 }, 
          ars: { cantidad: 0, cotizacion: globalCotizaciones?.ars || 0 } 
        }

      setEfectivo(efectivoInit)
      setMonedasExtranjeras(monedasInit)
      setTotalEfectivo(computeTotalEfectivo(efectivoInit, monedasInit))

      setNoEfectivo({
        pagosTarjeta: initialData.pagosTarjeta || initialData.pagos_tarjeta || 0,
        pedidosYa: initialData.pedidosYa || initialData.pedidos_ya || 0,
        ventasTransferencia: initialData.ventasTransferencia || initialData.ventas_transferencia || 0
      })

      setServicios(initialData.servicios || {})

      const ventasCredito = initialData.ventasCredito || initialData.ventas_credito || 0
      setCredito({
        cliente: initialData.creditoDetalles?.cliente || '',
        descripcion: initialData.creditoDetalles?.descripcion || '',
        monto: ventasCredito || 0
      })
    } else {
      setEfectivo({})
      setTotalEfectivo(0)
      setNoEfectivo({ pagosTarjeta: 0, pedidosYa: 0, ventasTransferencia: 0 })
      setServicios({})
      setCredito({ cliente: '', descripcion: '', monto: 0 })
      setMotivoEdicion('')
    }
  }, [initialData])

  // Sync with global cotizaciones if not editing
  useEffect(() => {
    if (!initialData && globalCotizaciones) {
      setCotizaciones(globalCotizaciones)
    }
  }, [globalCotizaciones, initialData])

  useEffect(() => {
    setMonedasExtranjeras(prev => ({
      usd: { cantidad: prev.usd?.cantidad || 0, cotizacion: cotizaciones.usd || 0 },
      brl: { cantidad: prev.brl?.cantidad || 0, cotizacion: cotizaciones.brl || 0 },
      ars: { cantidad: prev.ars?.cantidad || 0, cotizacion: cotizaciones.ars || 0 }
    }))
  }, [cotizaciones])

  // Handlers for saving data from modals
  const handleSaveEfectivo = async (data, total) => {
    const efec = data.efectivo || {}
    const monExt = data.monedasExtranjeras || data.monedas_extranjeras || {
      usd: { cantidad: 0, cotizacion: cotizaciones.usd || 0 },
      brl: { cantidad: 0, cotizacion: cotizaciones.brl || 0 },
      ars: { cantidad: 0, cotizacion: cotizaciones.ars || 0 }
    }

    if (initialData?.id) {
      // Edit mode: staging
      setEfectivo(efec)
      setMonedasExtranjeras(monExt)
      setTotalEfectivo(total)
    } else {
      // New mode: direct save
      const mov = {
        cotizaciones,
        efectivo: efec,
        monedasExtranjeras: monExt,
        totalEfectivo: total // For local calculation if needed
      }
      await onSubmit(mov)
      // Cleanup is handled by refresh/reset in handleSubmit if called manually, 
      // but here we just reset local state
      setEfectivo({})
      setTotalEfectivo(0)
    }
  }

  const handleSaveNoEfectivo = async (data) => {
    if (initialData?.id) {
      setNoEfectivo(data)
    } else {
      const mov = {
        cotizaciones,
        ...data // pagosTarjeta, pedidosYa, ventasTransferencia
      }
      await onSubmit(mov)
      setNoEfectivo({ pagosTarjeta: 0, pedidosYa: 0, ventasTransferencia: 0 })
    }
  }

  const handleSaveServicios = async (data) => {
    if (initialData?.id) {
      setServicios(prev => ({ ...prev, ...data }))
    } else {
      const mov = {
        cotizaciones,
        servicios: data
      }
      await onSubmit(mov)
      setServicios({})
    }
  }

  const handleSaveCredito = async (data) => {
    if (initialData?.id) {
      setCredito(data)
    } else {
      const totalCred = data.monto || 0
      const mov = {
        cotizaciones,
        ventasCredito: totalCred,
        creditoDetalles: totalCred > 0 ? {
          cliente: data.cliente,
          descripcion: data.descripcion
        } : null
      }
      await onSubmit(mov)
      setCredito({ cliente: '', descripcion: '', monto: 0 })
    }
  }

  const handleCotizacionBlur = () => {
    // Only update global if we are NOT editing an old record
    if (!initialData?.id) {
       updateGlobalCotizaciones(cotizaciones)
    }
  }

  // Calculate totals for button badges
  const totalNoEfectivo = (noEfectivo.pagosTarjeta || 0) + (noEfectivo.pedidosYa || 0) + (noEfectivo.ventasTransferencia || 0)
  
  const totalServiciosTarjeta = Object.values(servicios).reduce((acc, curr) => acc + (curr.tarjeta || 0), 0)
  const totalServiciosEfectivo = Object.values(servicios).reduce((acc, curr) => acc + (curr.monto || 0), 0)
  
  const totalCredito = credito.monto || 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Construct the movement object
    const movimiento = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      fecha: fecha, // Passed back to parent to handle time append
      ...(initialData?.arqueado !== undefined ? { arqueado: initialData.arqueado } : {}),
      cotizaciones,
      efectivo,
      monedasExtranjeras: monedasExtranjeras,
      ...noEfectivo, // Spread pagosTarjeta, pedidosYa, ventasTransferencia
      servicios,
      ventasCredito: totalCredito,
      // Add credit details if exists
      creditoDetalles: totalCredito > 0 ? {
        cliente: credito.cliente,
        descripcion: credito.descripcion
      } : null,
      motivoEdicion: motivoEdicion
    }

    // Pass to parent
    await onSubmit(movimiento)
    
    // Reset form
    setEfectivo({})
    setTotalEfectivo(0)
    setMonedasExtranjeras({
      usd: { cantidad: 0, cotizacion: cotizaciones.usd || 0 },
      brl: { cantidad: 0, cotizacion: cotizaciones.brl || 0 },
      ars: { cantidad: 0, cotizacion: cotizaciones.ars || 0 }
    })
    setNoEfectivo({ pagosTarjeta: 0, pedidosYa: 0, ventasTransferencia: 0 })
    setServicios({})
    setCredito({ cliente: '', descripcion: '', monto: 0 })
    setMotivoEdicion('')

    if (initialData?.id && onCancelEdit) onCancelEdit()
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-6">
        {initialData?.id ? 'Editar Movimiento' : 'Movimientos Generales'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cotizaciones */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-600 mb-3 text-center uppercase tracking-wider">
            Cotizaciones (Referencia)
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dólar</label>
              <input
                type="text"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                value={formatInputNumber(cotizaciones.usd)}
                onChange={(e) => setCotizaciones({...cotizaciones, usd: parseCurrency(e.target.value)})}
                onBlur={handleCotizacionBlur}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Real</label>
              <input
                type="text"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                value={formatInputNumber(cotizaciones.brl)}
                onChange={(e) => setCotizaciones({...cotizaciones, brl: parseCurrency(e.target.value)})}
                onBlur={handleCotizacionBlur}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Peso</label>
              <input
                type="text"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                value={formatInputNumber(cotizaciones.ars)}
                onChange={(e) => setCotizaciones({...cotizaciones, ars: parseCurrency(e.target.value)})}
                onBlur={handleCotizacionBlur}
              />
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setModals({...modals, efectivo: true})}
            className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <span className="font-semibold text-gray-700 group-hover:text-blue-700">Registrar Efectivo</span>
            {totalEfectivo > 0 && (
              <span className="text-sm font-bold text-green-600 mt-1">{formatCurrency(totalEfectivo)}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setModals({...modals, noEfectivo: true})}
            className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <span className="font-semibold text-gray-700 group-hover:text-blue-700">Registrar No Efectivo</span>
            {totalNoEfectivo > 0 && (
              <span className="text-sm font-bold text-green-600 mt-1">{formatCurrency(totalNoEfectivo)}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setModals({...modals, serviciosEfectivo: true})}
            className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <span className="font-semibold text-gray-700 group-hover:text-blue-700">Servicios</span>
            {(totalServiciosEfectivo > 0 || totalServiciosTarjeta > 0) && (
              <span className="text-sm font-bold text-green-600 mt-1">
                {formatCurrency(totalServiciosEfectivo + totalServiciosTarjeta)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setModals({...modals, credito: true})}
            className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <span className="font-semibold text-gray-700 group-hover:text-blue-700">Ventas a Crédito</span>
            {totalCredito > 0 && (
              <span className="text-sm font-bold text-green-600 mt-1">{formatCurrency(totalCredito)}</span>
            )}
          </button>
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
              Este motivo quedará registrado en el historial de auditoría de este movimiento.
            </p>
          </div>
        )}

        {/* Submit Button (Only visible in Edit Mode) */}
        {initialData?.id && (
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onCancelEdit && onCancelEdit()}
              className="px-6 py-3 bg-white text-gray-700 font-bold rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={initialData?.id && !motivoEdicion.trim()}
              className={`px-6 py-3 text-white font-bold rounded-lg shadow-md transition-all ${
                initialData?.id && !motivoEdicion.trim() 
                  ? 'bg-gray-400 cursor-not-allowed grayscale' 
                  : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
              }`}
            >
              Guardar Cambios
            </button>
          </div>
        )}
      </form>

      {/* Modals */}
      <EfectivoModal
        isOpen={modals.efectivo}
        onClose={() => setModals({...modals, efectivo: false})}
        onSave={handleSaveEfectivo}
        initialData={efectivo}
        initialMonedasExtranjeras={monedasExtranjeras}
        cotizaciones={cotizaciones}
      />
      <NoEfectivoModal
        isOpen={modals.noEfectivo}
        onClose={() => setModals({...modals, noEfectivo: false})}
        onSave={handleSaveNoEfectivo}
        initialData={noEfectivo}
      />
      <ServiciosModal
        isOpen={modals.serviciosEfectivo}
        onClose={() => setModals({...modals, serviciosEfectivo: false})}
        onSave={handleSaveServicios}
        initialData={servicios}
      />
      <CreditoModal
        isOpen={modals.credito}
        onClose={() => setModals({...modals, credito: false})}
        onSave={handleSaveCredito}
        initialData={credito}
      />
    </div>
  )
}
