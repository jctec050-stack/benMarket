'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { formatCurrency } from '@/lib/utils'
import { calcularTotalesArqueo } from '@/lib/arqueoUtils'
import { CONFIG, getServicioLabel } from '@/lib/config'
import { exportArqueoPDF } from '@/lib/pdfExport'
import { db } from '@/lib/db'
import { consolidateArqueos } from '@/lib/arqueoConsolidator'
import { useNotifications } from '@/context/NotificationContext'

export default function ArqueoPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { success, error: notifyError, confirm } = useNotifications()
  const { 
    ingresos, // movimientosTemporales
    egresos, // egresosCaja
    movimientos, // Operaciones
    addArqueo, 
    updateArqueo,
    loadingData, 
    selectedDate,
    setSelectedDate,
    selectedCaja,
    setSelectedCaja,
    selectedCajero,
    setSelectedCajero
  } = useData()
  const router = useRouter()

  const [fondoFijo, setFondoFijo] = useState(0)
  const [saving, setSaving] = useState(false)
  const [arqueosGuardados, setArqueosGuardados] = useState([])
  const [arqueoSeleccionado, setArqueoSeleccionado] = useState(null)
  const [verArqueos, setVerArqueos] = useState(false)

  const isCajero = profile?.rol === 'cajero'

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    if (!isCajero) return
    setSelectedCajero(profile?.username || user.email)
  }, [isCajero, profile?.username, user])

  // Fetch past Arqueos
  useEffect(() => {
    const fetchArqueos = async () => {
      // Fetch arqueos for the selected date
      const res = await db.getArqueos(selectedDate, null) // Get all for the date to allow client-side filtering / consolidation
      if (res.success) {
        setArqueosGuardados(res.data)
        
        const isAllCajas = selectedCaja === 'Todas las cajas'
        const isAllCajeros = selectedCajero === 'Todos los cajeros'

        if (isAllCajas || isAllCajeros) {
          // Filtering logic
          const matches = res.data.filter(a => {
            const matchCaja = isAllCajas || a.caja === selectedCaja
            const matchCajero = isAllCajeros || (a.cajero === selectedCajero)
            return matchCaja && matchCajero
          })

          if (matches.length > 1) {
            setArqueoSeleccionado(consolidateArqueos(matches))
          } else if (matches.length === 1) {
            setArqueoSeleccionado(matches[0])
          } else {
            setArqueoSeleccionado(null)
          }
        } else {
          // Specific Box + Specific Cashier
          const match = res.data.find(a => 
            a.caja === selectedCaja && 
            (a.cajero === selectedCajero || (isCajero && (a.cajero === user?.email || a.cajero === profile?.username)))
          )
          setArqueoSeleccionado(match || null)
        }
      }
    }
    fetchArqueos()
  }, [selectedDate, selectedCaja, selectedCajero, isCajero, user, profile?.username])

  // Load Fondo Fijo from DB (Replaces legacy localStorage)
  useEffect(() => {
    const fetchFondo = async () => {
      if (selectedCaja) {
        const res = await db.getFondoFijo(selectedCaja);
        if (res.success) {
          setFondoFijo(res.data);
        }
      }
    };
    fetchFondo();
  }, [selectedCaja])

  // --- FILTERING LOGIC ---
  const { filteredIngresos, filteredEgresos, totals, availableCajeros } = useMemo(() => {
    // Collect all unique cajeros for the dropdown
    const cajerosSet = new Set()
    const allowedCajeros = isCajero ? [user?.email, profile?.username, profile?.nombre].filter(Boolean) : null

    // 1. Filter Ingresos (Dashboard Sales)
    const ing = ingresos.filter(m => {
      const mDate = m.fecha.split('T')[0]
      const mCaja = m.caja
      const mCajero = m.cajero || m.usuario || 'Desconocido'
      
      if (mDate === selectedDate && (selectedCaja === 'Todas las cajas' || mCaja === selectedCaja)) {
        cajerosSet.add(mCajero)
      }

      // Filter by Date & Box & Cajero
      const dateMatch = mDate === selectedDate
      const cajaMatch = selectedCaja === 'Todas las cajas' || mCaja === selectedCaja
      
      const normalizedMCajero = mCajero.trim().toLowerCase()
      const normalizedSelectedCajero = String(selectedCajero || '').trim().toLowerCase()
      
      const cajeroMatch = isCajero 
        ? (allowedCajeros?.some(a => a.trim().toLowerCase() === normalizedMCajero) || false) 
        : (normalizedSelectedCajero === 'todos los cajeros' || normalizedMCajero === normalizedSelectedCajero)
      
      return dateMatch && cajaMatch && cajeroMatch && !m.arqueado
    })

    // 2. Filter Egresos (Expenses Page)
    const egr1 = egresos.filter(e => {
      const eDate = e.fecha.split('T')[0]
      const eCaja = e.caja
      const eCajero = e.cajero || e.usuario || 'Desconocido'
      
      if (eDate === selectedDate && (selectedCaja === 'Todas las cajas' || eCaja === selectedCaja)) {
        cajerosSet.add(eCajero)
      }

      const dateMatch = eDate === selectedDate
      const cajaMatch = selectedCaja === 'Todas las cajas' || eCaja === selectedCaja
      
      const normalizedECajero = eCajero.trim().toLowerCase()
      const normalizedSelectedCajero = String(selectedCajero || '').trim().toLowerCase()
      
      const cajeroMatch = isCajero 
        ? (allowedCajeros?.some(a => a.trim().toLowerCase() === normalizedECajero) || false) 
        : (normalizedSelectedCajero === 'todos los cajeros' || normalizedECajero === normalizedSelectedCajero)

      return dateMatch && cajaMatch && cajeroMatch && !e.arqueado
    })

    // 3. Filter Egresos from Operaciones (Gastos/Egresos types)
    const egr2 = movimientos.filter(m => {
      const mDate = m.fecha.split('T')[0]
      const mCaja = m.caja
      const mCajero = m.cajero || m.usuario || 'Desconocido'
      const isExpense = m.tipo === 'gasto' || m.tipo === 'egreso'
      
      if (isExpense && mDate === selectedDate && (selectedCaja === 'Todas las cajas' || mCaja === selectedCaja)) {
        cajerosSet.add(mCajero)
      }

      const dateMatch = mDate === selectedDate
      const cajaMatch = selectedCaja === 'Todas las cajas' || mCaja === selectedCaja
      
      const normalizedMCajero = mCajero.trim().toLowerCase()
      const normalizedSelectedCajero = String(selectedCajero || '').trim().toLowerCase()
      
      const cajeroMatch = isCajero 
        ? (allowedCajeros?.some(a => a.trim().toLowerCase() === normalizedMCajero) || false) 
        : (normalizedSelectedCajero === 'todos los cajeros' || normalizedMCajero === normalizedSelectedCajero)

      return isExpense && dateMatch && cajaMatch && cajeroMatch && !m.arqueado
    })

    const allEgresos = [...egr1, ...egr2]

    // Combine for calculation
    const movementsForCalc = [
      ...ing.map(m => ({ ...m, tipoMovimiento: 'ingreso' })),
      ...allEgresos.map(e => ({ ...e, tipoMovimiento: 'egreso' }))
    ]

    const calculatedTotals = calcularTotalesArqueo(movementsForCalc)

    return {
      filteredIngresos: ing,
      filteredEgresos: allEgresos,
      totals: calculatedTotals,
      availableCajeros: Array.from(cajerosSet).sort()
    }
  }, [ingresos, egresos, movimientos, selectedDate, selectedCaja, selectedCajero, isCajero, user, profile?.username])


  const egresosForView = useMemo(() => {
    const dateBase = (arqueoSeleccionado?.fecha ? String(arqueoSeleccionado.fecha).split('T')[0] : selectedDate)
    const cajaBase = arqueoSeleccionado?.caja || selectedCaja
    const cajeroBaseRaw = arqueoSeleccionado?.cajero || selectedCajero
    const cajeroBase = cajeroBaseRaw === 'Todos los cajeros' ? null : cajeroBaseRaw

    const matchCaja = (value) => cajaBase === 'Todas las cajas' || value === cajaBase
    const matchCajero = (value) => {
      if (isCajero) return value === user?.email || value === profile?.username
      return !cajeroBase || value === cajeroBase
    }

    const egr1 = egresos.filter(e => {
      const eDate = String(e.fecha || '').split('T')[0]
      const eCaja = e.caja
      const eCajero = e.cajero || e.usuario || 'Desconocido'
      return eDate === dateBase && matchCaja(eCaja) && matchCajero(eCajero)
    })

    const egr2 = movimientos.filter(m => {
      const mDate = String(m.fecha || '').split('T')[0]
      const mCaja = m.caja
      const mCajero = m.cajero || m.usuario || 'Desconocido'
      const isExpense = m.tipo === 'gasto' || m.tipo === 'egreso'
      return isExpense && mDate === dateBase && matchCaja(mCaja) && matchCajero(mCajero)
    })

    return [...egr1, ...egr2].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))
  }, [egresos, movimientos, selectedDate, selectedCaja, selectedCajero, arqueoSeleccionado, isCajero, user, profile?.username])

  // --- CALCULATION OF FINAL NUMBERS ---
  const savedData = useMemo(() => {
    if (!arqueoSeleccionado) return null

    const legacyMonedas = {
      usd: arqueoSeleccionado.dolares || { cantidad: 0, montoGs: 0 },
      brl: arqueoSeleccionado.reales || { cantidad: 0, montoGs: 0 },
      ars: arqueoSeleccionado.pesos || { cantidad: 0, montoGs: 0 }
    }

    return {
      isSaved: true,
      efectivo: arqueoSeleccionado.efectivo || arqueoSeleccionado.efectivoDetalle || {},
      monedasExtranjeras: arqueoSeleccionado.monedasExtranjeras || arqueoSeleccionado.monedasExtranjeras || legacyMonedas,
      servicios: arqueoSeleccionado.servicios || { otros: {} },
      totalEfectivoBruto: arqueoSeleccionado.total_efectivo || arqueoSeleccionado.totalEfectivo || 0,
      totalEgresosMonto: arqueoSeleccionado.total_egresos || arqueoSeleccionado.totalEgresos || 0,
      pagosTarjeta: arqueoSeleccionado.pagosTarjeta || arqueoSeleccionado.pagos_tarjeta || 0,
      ventasCredito: arqueoSeleccionado.ventasCredito || arqueoSeleccionado.ventas_credito || 0,
      pedidosYa: arqueoSeleccionado.pedidosYa || arqueoSeleccionado.pedidos_ya || 0,
      ventasTransferencia: arqueoSeleccionado.ventasTransferencia || arqueoSeleccionado.ventas_transferencia || 0,
      fondoFijo: arqueoSeleccionado.fondo_fijo || arqueoSeleccionado.fondoFijo || 0,
      totalIngresosTienda: arqueoSeleccionado.totalIngresosTienda ?? arqueoSeleccionado.total_ingresos_tienda ?? 0,
      egresosList: egresosForView
    }
  }, [arqueoSeleccionado, egresosForView])

  const liveData = useMemo(() => {
    let totalEfectivoBruto = 0
    CONFIG.denominaciones.forEach(d => {
      const data = totals.efectivo[d.valor]
      if (data) totalEfectivoBruto += (data.ingreso * d.valor)
    })
    totalEfectivoBruto += totals.monedasExtranjeras.usd.montoGs
    totalEfectivoBruto += totals.monedasExtranjeras.brl.montoGs
    totalEfectivoBruto += totals.monedasExtranjeras.ars.montoGs

    const totalEgresosMonto = filteredEgresos.reduce((acc, curr) => acc + (curr.monto || 0), 0)

    return {
      isSaved: false,
      efectivo: totals.efectivo,
      monedasExtranjeras: totals.monedasExtranjeras,
      servicios: totals.servicios,
      pagosTarjeta: totals.pagosTarjeta,
      ventasCredito: totals.ventasCredito,
      pedidosYa: totals.pedidosYa,
      ventasTransferencia: totals.ventasTransferencia,
      totalEfectivoBruto,
      totalEgresosMonto,
      fondoFijo: fondoFijo,
      egresosList: filteredEgresos
    }
  }, [totals, filteredEgresos, fondoFijo])

  const displayData = savedData || liveData

  const hasChanges = useMemo(() => {
    if (!savedData) return false

    const stableStringify = (obj) => {
      if (obj === null || obj === undefined) return String(obj)
      if (typeof obj !== 'object') return JSON.stringify(obj)
      if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`
      const keys = Object.keys(obj).sort()
      return `{${keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',')}}`
    }

    const normalize = (d) => {
      const efectivo = {}
      CONFIG.denominaciones.forEach(den => {
        const v = den.valor
        const raw = d.efectivo?.[v]
        const cant = raw && typeof raw === 'object' ? (raw.ingreso ?? raw.neto ?? 0) : (raw ?? 0)
        efectivo[String(v)] = parseInt(cant, 10) || 0
      })

      const monedas = {}
      ;['usd', 'brl', 'ars'].forEach(k => {
        const m = d.monedasExtranjeras?.[k] || {}
        const cantidad = Number(m.cantidad || 0)
        const cotizacion = Number(m.cotizacion || 0)
        const montoGs = m.montoGs !== undefined ? Number(m.montoGs || 0) : (cantidad * cotizacion)
        monedas[k] = {
          cantidad: Math.round(cantidad * 100) / 100,
          cotizacion: Math.round(cotizacion),
          montoGs: Math.round(montoGs)
        }
      })

      const servicios = {}
      const src = d.servicios || {}
      Object.entries(src).forEach(([k, v]) => {
        if (!v) return
        if (v.monto !== undefined) {
          servicios[k] = { monto: Math.round(v.monto || 0), tarjeta: Math.round(v.tarjeta || 0) }
          return
        }
        if (typeof v === 'object') {
          Object.entries(v).forEach(([kk, sv]) => {
            if (!sv) return
            servicios[kk] = { monto: Math.round(sv.monto || 0), tarjeta: Math.round(sv.tarjeta || 0) }
          })
        }
      })

      return {
        fondoFijo: Math.round(d.fondoFijo || 0),
        totalEfectivoBruto: Math.round(d.totalEfectivoBruto || 0),
        totalEgresosMonto: Math.round(d.totalEgresosMonto || 0),
        pagosTarjeta: Math.round(d.pagosTarjeta || 0),
        ventasCredito: Math.round(d.ventasCredito || 0),
        pedidosYa: Math.round(d.pedidosYa || 0),
        ventasTransferencia: Math.round(d.ventasTransferencia || 0),
        efectivo,
        monedas,
        servicios
      }
    }

    return stableStringify(normalize(savedData)) !== stableStringify(normalize(liveData))
  }, [savedData, liveData])

  // Common calculations for both live and saved
  let totalServiciosEfectivo = 0
  let totalServiciosGeneral = 0
  
  Object.values(displayData.servicios).forEach(val => {
     if (val.monto !== undefined) {
        totalServiciosEfectivo += val.monto
        totalServiciosGeneral += (val.monto + val.tarjeta)
     } else if (typeof val === 'object') {
        Object.values(val).forEach(sub => {
           totalServiciosEfectivo += sub.monto || 0
           totalServiciosGeneral += (sub.monto || 0) + (sub.tarjeta || 0)
        })
     }
  })

  const totalAEntregarGs = displayData.totalEfectivoBruto - displayData.fondoFijo
  const totalADeclarar = displayData.totalEgresosMonto + displayData.totalEfectivoBruto
  
  // Use stored value if available (for saved or consolidated arqueos), otherwise calculate
  const totalIngresosTiendaCalculado = displayData.totalIngresosTienda !== undefined 
    ? displayData.totalIngresosTienda 
    : (totalADeclarar - totalServiciosEfectivo - displayData.fondoFijo)

  const handleSaveArqueo = async () => {
    const msg = displayData.isSaved
      ? '¿Está seguro de actualizar el arqueo con los cambios detectados?'
      : '¿Está seguro de guardar el arqueo? Esto marcará los movimientos como arqueados.'
    
    const ok = await confirm({
      title: displayData.isSaved ? 'Actualizar Arqueo' : 'Cerrar Arqueo',
      message: msg,
      confirmText: displayData.isSaved ? 'Actualizar' : 'Guardar y Cerrar',
      type: 'info'
    })

    if (!ok) return

    setSaving(true)
    try {
      const dataToSave = (savedData && hasChanges) ? liveData : displayData
      const arqueoData = {
        fecha: selectedDate,
        caja: selectedCaja,
        cajero: profile?.username || user?.email || 'unknown',
        fondo_fijo: dataToSave.fondoFijo,
        total_efectivo: dataToSave.totalEfectivoBruto,
        total_egresos: dataToSave.totalEgresosMonto,
        total_servicios: totalServiciosGeneral,
        total_ingresos: totalADeclarar,
        pagos_tarjeta: dataToSave.pagosTarjeta,
        ventas_credito: dataToSave.ventasCredito,
        pedidos_ya: dataToSave.pedidosYa,
        ventas_transferencia: dataToSave.ventasTransferencia,
        efectivo: dataToSave.efectivo,
        dolares: dataToSave.monedasExtranjeras?.usd,
        reales: dataToSave.monedasExtranjeras?.brl,
        pesos: dataToSave.monedasExtranjeras?.ars,
        servicios: dataToSave.servicios,
        monedasExtranjeras: dataToSave.monedasExtranjeras,
        totalIngresosTienda: totalIngresosTiendaCalculado,
        otrosServicios: [] 
      }

      const res = (displayData.isSaved && hasChanges && arqueoSeleccionado?.id)
        ? await updateArqueo(arqueoSeleccionado.id, arqueoData)
        : await addArqueo(arqueoData)
      
      if (res.success) {
        success(
          displayData.isSaved ? 'Arqueo Actualizado' : 'Arqueo Guardado', 
          displayData.isSaved ? 'Los cambios se registraron correctamente.' : 'El arqueo se ha guardado y la caja está lista para el cierre.'
        )
        // Automatically show the saved arqueo now
        setArqueoSeleccionado(res.data)
      } else {
        notifyError(
          displayData.isSaved ? 'Error al Actualizar' : 'Error al Guardar', 
          'No se pudo completar la operación en la base de datos.'
        )
      }
    } catch (e) {
      console.error(e)
      notifyError('Error Inesperado', 'Ocurrió un error crítico al procesar el arqueo.')
    } finally {
      setSaving(false)
    }
  }

  const handleExportPDF = () => {
    const arqueoData = {
      fecha: arqueoSeleccionado ? arqueoSeleccionado.fecha : selectedDate,
      caja: arqueoSeleccionado ? arqueoSeleccionado.caja : selectedCaja,
      cajero: arqueoSeleccionado ? arqueoSeleccionado.cajero : (selectedCajero !== 'Todos los cajeros' ? selectedCajero : user?.email),
      fondo_fijo: displayData.fondoFijo,
      total_efectivo: displayData.totalEfectivoBruto,
      total_egresos: displayData.totalEgresosMonto
    }
    // We pass the displayData (which acts like totals structure) to the PDF exporter
    exportArqueoPDF(arqueoData, displayData)
  }

  if (authLoading || !user) return <div>Cargando...</div>

  return (
    <div className="w-full">
      <main className="container mx-auto px-4 py-8 max-w-4xl flex flex-col items-center">
        <div className="w-full flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Arqueo de Caja</h1>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <span className="text-blue-600 font-black">ARQUEO DE CAJA</span>
              {!isCajero ? (
                <div className="flex gap-2">
                  <select 
                    value={selectedCaja} 
                    onChange={(e) => setSelectedCaja(e.target.value)}
                    className="ml-2 bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-700 text-lg font-bold"
                  >
                    <option value="Caja 1">Caja 1</option>
                    <option value="Caja 2">Caja 2</option>
                    <option value="Caja 3">Caja 3</option>
                    <option value="Tesoreria">Tesoreria</option>
                    <option value="Todas las cajas">Todas las cajas</option>
                  </select>
                  <select 
                    value={selectedCajero} 
                    onChange={(e) => setSelectedCajero(e.target.value)}
                    className="bg-transparent border-b-2 border-green-500 focus:outline-none text-gray-700 text-lg font-bold"
                  >
                    <option value="Todos los cajeros">Todos los cajeros</option>
                    {availableCajeros.sort().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-gray-600">{selectedCaja} - {selectedCajero}</span>
              )}
            </h1>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 text-gray-600 bg-transparent border-none cursor-pointer hover:bg-gray-100 px-2 py-1 rounded -ml-2 focus:ring-0 focus:outline-none"
            />
          </div>
          
          <div className="flex items-center gap-4">
            {arqueoSeleccionado?.isConsolidated && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                📊 MODO CONSOLIDADO (Suma de Cajas)
              </span>
            )}

          </div>
        </div>

        {/* Removed "Ver Guardados" button and table section */}

        {/* --- REPORT LAYOUT --- */}
        <div className={`w-full flex flex-col gap-8 ${displayData.isSaved ? 'opacity-90' : ''}`}>
          
          {/* Cash Breakdown */}
          <div className="w-full">
            <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
                Conteo de Efectivo (Ingresos)
              </h3>
              
              <table className="w-full text-sm">
                <thead>
                   <tr className="text-left text-gray-500 border-b">
                     <th className="pb-2">Denominación</th>
                     <th className="pb-2 text-center">Cant</th>
                     <th className="pb-2 text-right">Monto</th>
                   </tr>
                </thead>
                <tbody>
                  {CONFIG.denominaciones.map(d => {
                    const countObj = displayData.efectivo[d.valor]
                    const cantFinal = countObj ? (typeof countObj === 'object' ? countObj.ingreso : countObj) : 0
                    if (!cantFinal || cantFinal === 0) return null
                    return (
                      <tr key={d.valor} className="border-b border-gray-100">
                        <td className="py-2">{d.nombre}</td>
                        <td className="py-2 text-center font-bold">{cantFinal}</td>
                        <td className="py-2 text-right">{formatCurrency(cantFinal * d.valor)}</td>
                      </tr>
                    )
                  })}
                  {/* Foreign Currency */}
                  {Object.entries(displayData.monedasExtranjeras).map(([key, val]) => {
                     if (val.cantidad === 0) return null
                     return (
                       <tr key={key} className="border-b border-gray-100 bg-yellow-50">
                         <td className="py-2 uppercase font-medium">{key}</td>
                         <td className="py-2 text-center">{val.cantidad}</td>
                         <td className="py-2 text-right">{formatCurrency(val.montoGs)}</td>
                       </tr>
                     )
                  })}
                </tbody>
              </table>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                   <span>Total Efectivo Bruto:</span>
                   <span>{formatCurrency(displayData.totalEfectivoBruto)}</span>
                </div>
                <div className="flex justify-between text-red-500">
                   <span>- Fondo Fijo:</span>
                   <span>-{formatCurrency(displayData.fondoFijo)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2 mt-2">
                   <span>Total a Entregar:</span>
                   <span>{formatCurrency(totalAEntregarGs)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Non-Cash */}
          <div className="w-full bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
              Ingresos No Efectivo
            </h3>
            {displayData.noEfectivoPorCajero && Object.keys(displayData.noEfectivoPorCajero).length > 1 && (
              <div className="mb-6 overflow-x-auto border rounded-lg">
                <table className="w-full text-[10px] sm:text-xs text-left border-collapse">
                   <thead>
                     <tr className="bg-gray-50 border-b">
                       <th className="p-2 font-bold">Cajero</th>
                       <th className="p-2 text-right">Tarjeta</th>
                       <th className="p-2 text-right">Crédito</th>
                       <th className="p-2 text-right">P. Ya</th>
                       <th className="p-2 text-right">Transf</th>
                     </tr>
                   </thead>
                   <tbody>
                     {Object.entries(displayData.noEfectivoPorCajero).map(([name, vals]) => (
                       <tr key={name} className="border-b hover:bg-gray-50 last:border-0">
                         <td className="p-2 font-medium truncate max-w-[100px]" title={name}>{name}</td>
                         <td className="p-2 text-right">{formatCurrency(vals.tarjeta)}</td>
                         <td className="p-2 text-right">{formatCurrency(vals.credito)}</td>
                         <td className="p-2 text-right">{formatCurrency(vals.pedidosYa)}</td>
                         <td className="p-2 text-right">{formatCurrency(vals.transfer)}</td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Pagos con Tarjeta:</span>
                <span className="font-medium">{formatCurrency(displayData.pagosTarjeta)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventas a Crédito:</span>
                <span className="font-medium">{formatCurrency(displayData.ventasCredito)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pedidos YA:</span>
                <span className="font-medium">{formatCurrency(displayData.pedidosYa)}</span>
              </div>
              <div className="flex justify-between">
                <span>Transferencias:</span>
                <span className="font-medium">{formatCurrency(displayData.ventasTransferencia)}</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="w-full bg-white rounded-lg shadow p-6">
             <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
              Servicios
             </h3>
             <table className="w-full text-xs">
               <thead>
                 <tr className="text-left text-gray-500">
                   <th>Servicio</th>
                   <th className="text-right">Efectivo</th>
                   <th className="text-right">Tarjeta</th>
                 </tr>
               </thead>
               <tbody>
                 {['apLote', 'aquiPago', 'expressLote', 'wepa', 'pasajeNsa', 'encomiendaNsa', 'apostala'].map(key => {
                    const s = displayData.servicios[key]
                    if (!s || (s.monto === 0 && s.tarjeta === 0)) return null
                    return (
                      <tr key={key} className="border-b border-gray-100">
                        <td className="py-1 font-medium">{getServicioLabel(key)}</td>
                        <td className="py-1 text-right">{formatCurrency(s.monto)}</td>
                        <td className="py-1 text-right">{formatCurrency(s.tarjeta)}</td>
                      </tr>
                    )
                 })}
                 {displayData.servicios.otros && Object.entries(displayData.servicios.otros).map(([name, s]) => (
                    <tr key={name} className="border-b border-gray-100">
                      <td className="py-1 font-medium">{getServicioLabel(name)}</td>
                      <td className="py-1 text-right">{formatCurrency(s.monto)}</td>
                      <td className="py-1 text-right">{formatCurrency(s.tarjeta)}</td>
                    </tr>
                 ))}
               </tbody>
               <tfoot className="font-bold bg-gray-50">
                  <tr>
                    <td className="py-2">TOTALES:</td>
                    <td className="py-2 text-right">{formatCurrency(totalServiciosEfectivo)}</td>
                    <td className="py-2 text-right">{formatCurrency(totalServiciosGeneral - totalServiciosEfectivo)}</td>
                  </tr>
               </tfoot>
             </table>
          </div>

          {/* Expenses */}
          <div className="w-full bg-white rounded-lg shadow p-6">
             <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
              Detalle de Egresos
             </h3>
             <div className="max-h-48 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs">
                  <tbody>
                    {displayData.egresosList.length > 0 ? displayData.egresosList.map((e, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1">{e.descripcion || e.categoria}</td>
                        <td className="py-1 text-right font-medium text-red-600">
                           {formatCurrency(e.monto)}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="2" className="text-center py-2 text-gray-400">
                        Sin egresos
                      </td></tr>
                    )}
                  </tbody>
                </table>
             </div>
             <div className="flex justify-between font-bold mt-4 pt-2 border-t">
                <span>TOTAL EGRESOS:</span>
                <span className="text-red-600">{formatCurrency(displayData.totalEgresosMonto)}</span>
             </div>
          </div>

        </div>

        {/* --- FINAL SUMMARY --- */}
        <div className={`w-full mt-8 bg-gray-900 text-white p-6 rounded-lg shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 ${displayData.isSaved ? 'opacity-90' : ''}`}>
           <div className="text-center md:text-left">
              <div className="text-sm text-gray-400 uppercase tracking-wider">Total a Declarar en Sistema</div>
              <div className="text-3xl font-bold text-yellow-400">{formatCurrency(totalADeclarar)}</div>
              <div className="text-xs text-gray-500 mt-1">(Egresos + Efectivo Bruto)</div>
           </div>
           
           <div className="h-px w-full md:w-px md:h-16 bg-gray-700"></div>

           <div className="text-center md:text-right">
              <div className="text-sm text-gray-400 uppercase tracking-wider">Total Ingresos Tienda</div>
              <div className={`text-3xl font-bold ${totalIngresosTiendaCalculado < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {formatCurrency(totalIngresosTiendaCalculado)}
              </div>
              <div className="text-xs text-gray-500 mt-1">(Total Declarar - Servicios Efectivo - Fondo)</div>
           </div>
        </div>

        <div className="mt-8 w-full flex justify-end gap-3">
          <button 
            onClick={handleExportPDF}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow"
          >
            📄 PDF
          </button>
          {!arqueoSeleccionado?.isConsolidated && (
            <button 
              onClick={handleSaveArqueo}
              disabled={saving || (displayData.isSaved && !hasChanges)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-transform transform hover:scale-105 disabled:opacity-50"
            >
              {saving
                ? 'Guardando...'
                : (displayData.isSaved ? 'Actualizar Arqueo' : 'Guardar y Cerrar Caja')}
            </button>
          )}
        </div>

      </main>
    </div>
  )
}
