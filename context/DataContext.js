'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { db } from '@/lib/db'
import { useAuth } from './AuthContext'

const DataContext = createContext({})

export const DataProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const [ingresos, setIngresos] = useState([])
  const [egresos, setEgresos] = useState([])
  const [arqueos, setArqueos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [cotizaciones, setCotizaciones] = useState({ usd: 7000, brl: 1250, ars: 0 })
  const [loadingData, setLoadingData] = useState(false)

  const getLocalISODate = () => {
    const now = new Date()
    const tzOffsetMs = now.getTimezoneOffset() * 60000
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10)
  }
  
  // Selected Date, Box (Caja) and Cashier (Cajero) for filtering
  const [selectedDate, setSelectedDate] = useState(getLocalISODate)
  const [selectedCaja, setSelectedCaja] = useState('Caja 1') // Default
  const [selectedCajero, setSelectedCajero] = useState('Todos los cajeros')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCaja = sessionStorage.getItem('cajaSeleccionada')
      if (storedCaja) {
        setSelectedCaja(storedCaja)
      }
      
      const storedDate = sessionStorage.getItem('fechaJornada')
      if (storedDate) {
        setSelectedDate(storedDate)
      }
    }
  }, [user])

  // Persist Date and Caja changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cajaSeleccionada', selectedCaja)
    }
  }, [selectedCaja])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fechaJornada', selectedDate)
    }
  }, [selectedDate])

  // Fetch data when user, date, caja or cajero changes
  useEffect(() => {
    if (user) {
      refreshData()
    }
  }, [user, selectedDate, selectedCaja, selectedCajero])

  // Sync listener
  useEffect(() => {
    const handleOnline = () => {
      console.log('Online: Syncing data...')
      db.syncOfflineData().then(({ synced }) => {
        if (synced > 0) refreshData()
      })
    }
    
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])
  const refreshData = async () => {
    setLoadingData(true)
    try {
      const isCajero = profile?.rol === 'cajero'
      const cajaParam = isCajero ? selectedCaja : 'Todas las cajas'

      // Parallel fetching
      const [resIngresos, resEgresos, resArqueos, resMovimientos, resCot] = await Promise.all([
        db.getMovimientosTemporales(selectedDate, cajaParam),
        db.getEgresos(selectedDate, cajaParam),
        db.getArqueos(selectedDate, cajaParam),
        db.getMovimientos(selectedDate, cajaParam),
        db.getCotizaciones()
      ])

      if (resIngresos.success) setIngresos(resIngresos.data)
      if (resEgresos.success) setEgresos(resEgresos.data)
      if (resArqueos.success) setArqueos(resArqueos.data)
      if (resMovimientos.success) setMovimientos(resMovimientos.data)
      if (resCot.success) setCotizaciones(resCot.data)

    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setLoadingData(false)
    }
  }

  // CRUD Wrappers that update local state immediately (Optimistic UI could be added here)
  const addIngreso = async (item) => {
    const res = await db.saveMovimientoTemporal(item)
    if (res.success) refreshData() // Or append to state directly
    return res
  }

  const deleteIngreso = async (id) => {
    const res = await db.deleteMovimientoTemporal(id)
    if (res.success) refreshData()
    return res
  }

  const addEgreso = async (item) => {
    const res = await db.saveEgreso(item)
    if (res.success) refreshData()
    return res
  }

  const deleteEgreso = async (id) => {
    const res = await db.deleteEgreso(id)
    if (res.success) refreshData()
    return res
  }
  
  const addArqueo = async (item) => {
     const res = await db.saveArqueo(item, user?.id)
     if (res.success) refreshData()
     return res
  }

  const updateArqueo = async (id, item) => {
     const res = await db.updateArqueo(id, item)
     if (res.success) refreshData()
     return res
  }

  const addMovimiento = async (item) => {
    const res = await db.saveMovimiento(item)
    if (res.success) refreshData()
    return res
  }

  const deleteMovimiento = async (id) => {
    const res = await db.deleteMovimiento(id)
    if (res.success) refreshData()
    return res
  }

  const updateGlobalCotizaciones = async (newCot) => {
    const res = await db.saveCotizaciones(newCot)
    if (res.success) {
      setCotizaciones(res.data)
    }
    return res
  }

  return (
    <DataContext.Provider value={{
      ingresos,
      egresos,
      arqueos,
      movimientos,
      cotizaciones,
      loadingData,
      selectedDate,
      setSelectedDate,
      selectedCaja,
      setSelectedCaja,
      selectedCajero,
      setSelectedCajero,
      refreshData,
      addIngreso,
      deleteIngreso,
      addEgreso,
      deleteEgreso,
      addArqueo,
      updateArqueo,
      addMovimiento,
      deleteMovimiento,
      updateGlobalCotizaciones
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
