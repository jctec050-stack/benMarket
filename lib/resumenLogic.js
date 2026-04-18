import { formatCurrency, parseCurrency } from './utils';
import { getServicioLabel } from './config';

/**
 * Processes data for the Resumen Dashboard
 */
export function processResumenData(movimientos, arqueos, egresos, recaudaciones, filterCaja) {
  // 1. Metrics Calculation
  let totalTarjeta = 0;
  let totalPedidosYa = 0;
  let totalCredito = 0;
  let totalTransferencia = 0;
  
  const serviciosBreakdown = {};
  
  const ingresosOtros = {
    inversiones: 0
  };

  const egresosBreakdown = {};

  // --- PRE-PROCESS: GLOBAL BREAKDOWNS (Independent of Recaudacion Table) ---
  // To ensure the summary table at the bottom shows EVERYTHING of the day
  
  // 1. All Categorized Egresos from 'egresos_caja'
  egresos.forEach(e => {
    const cat = e.categoria || 'Gastos Varios';
    egresosBreakdown[cat] = (egresosBreakdown[cat] || 0) + (e.monto || 0);
  });

  // 2. All Categorized Operations from 'movimientos' (Egresos type)
  movimientos.forEach(m => {
    const isIngreso = !m.tipo || m.tipo === 'ingreso' || m.tipo === 'deposito-inversiones';
    if (!isIngreso) {
      const cat = m.categoria || 'Gastos Administrativos';
      egresosBreakdown[cat] = (egresosBreakdown[cat] || 0) + Math.abs(m.monto || 0);
    }
  });

  // 3. Investments separate tracking
  movimientos.filter(m => m.tipo === 'deposito-inversiones').forEach(m => {
    ingresosOtros.inversiones += Math.abs(m.monto || 0);
  });

  // Combine movements (Ingresos + Operaciones)
  // Note: legacy combined 'movimientos' (Ops) and 'movimientosTemporales' (Ingresos)
  // We assume 'movimientos' passed here is already the combined list of ALL income/expense records
  
  movimientos.forEach(m => {
    // Only count positive income for these metrics (or standard sales)
    // Legacy check: !m.tipo || m.tipo === 'ingreso'
    const isIngreso = !m.tipo || m.tipo === 'ingreso' || m.tipo === 'deposito-inversiones';
    
    if (isIngreso) {
      totalTarjeta += (m.pagosTarjeta ?? m.pagos_tarjeta ?? 0);
      totalPedidosYa += (m.pedidosYa ?? m.pedidos_ya ?? 0);
      totalCredito += (m.ventasCredito ?? m.ventas_credito ?? 0);
      totalTransferencia += (m.ventas_transferencia ?? m.ventasTransferencia ?? 0);

      // Extract raw services from ALL movements, regardless of whether they are in a closed arqueo
      if (m.servicios) {
         Object.entries(m.servicios).forEach(([k, s]) => {
            const monto = s.monto || 0;
            if (monto > 0) {
               const label = getServicioLabel(k);
               serviciosBreakdown[label] = (serviciosBreakdown[label] || 0) + monto;
            }
         });
      }
      const others = m.otrosServicios || m.otros_servicios;
      if (others) {
         others.forEach(s => {
            const monto = s.monto || 0;
            if (monto > 0) {
               const label = s.nombre || 'Otros Servicios';
               serviciosBreakdown[label] = (serviciosBreakdown[label] || 0) + monto;
            }
         });
      }
    }
  });

  // 2. Recaudacion Table Data (Group by Cajero + Caja)
  const datosPorClave = {};

  // Helper to init key
  const initKey = (key, cajero, caja) => {
    if (!datosPorClave[key]) {
      datosPorClave[key] = {
        nombreCajero: cajero,
        nombreCaja: caja,
        efectivoBruto: 0,
        servicios: 0,
        egresos: 0,
        fondoFijo: 700000, // Default legacy
        totalDeclarar: 0,
        ingresoTiendaCalculado: 0,
        recaudadoReal: 0, // From input/db
        sobrante: 0,
        faltante: 0,
        isClosedArqueo: false
      };
    }
  };

  // 2a. Process Closed Arqueos (High Priority)
  arqueos.forEach(a => {
    const cajero = a.cajero || 'Desconocido';
    const caja = a.caja || 'Desconocida';
    const key = `${cajero}_${caja}`;

    initKey(key, cajero, caja);
    const d = datosPorClave[key];
    d.isClosedArqueo = true;

    // In legacy, Arqueo stores the snapshot totals
    // total_efectivo is the counted cash
    d.efectivoBruto += (a.total_efectivo || a.totalEfectivo || 0);
        // Services
      let serv = 0;
      if (a.servicios) {
         Object.entries(a.servicios).forEach(([k, v]) => {
            let monto = 0;
            if (v.monto) monto = v.monto;
            else Object.values(v).forEach(sub => monto += (sub.monto || 0));
            
            serv += monto;
         });
      }
      if (a.otrosServicios) {
          a.otrosServicios.forEach(s => {
            const monto = s.monto || 0;
            serv += monto;
          });
      }
      d.servicios += serv;

    d.egresos += (a.total_egresos || a.totalEgresos || 0);
    d.fondoFijo = (a.fondo_fijo !== undefined) ? a.fondo_fijo : (a.fondoFijo || 700000);
    
    // Calculate System Expectation
    // Formula: (EfectivoCounted + Egresos) - Services - Fondo
    // Wait, legacy formula for "Ingreso Tienda" inside Arqueo was derived from counts.
    // Here we want "What system expects".
    // Actually, legacy Recaudacion table used:
    // ingresoTiendaCalculado = (efectivoFisico + egresos) - serviciosEfectivo - fondo;
    // So it trusts the Arqueo Count as the "System Truth" for that closed session?
    // Yes, if Arqueo is closed, that IS the truth.
    

    d.totalDeclarar = d.efectivoBruto + d.egresos;
    // Prioritize saved value if exists, otherwise fallback to calculation
    const savedTiendaValue = a.totalIngresosTienda ?? a.total_ingresos_tienda;
    if (savedTiendaValue !== undefined && savedTiendaValue !== null) {
      d.ingresoTiendaCalculado = savedTiendaValue;
    } else {
      d.ingresoTiendaCalculado = d.totalDeclarar - d.servicios - d.fondoFijo;
    }
  });

  // 2b. Process Open Movements (Only if no closed arqueo for that key)
  movimientos.forEach(m => {
    const isIngreso = !m.tipo || m.tipo === 'ingreso' || m.tipo === 'deposito-inversiones';
    if (!isIngreso) return; // Handled in pre-process for egresosBreakdown

    if (m.tipo === 'deposito-inversiones') {
      // counted in pre-process for ingresosOtros.inversiones
    }

    const cajero = m.cajero || 'Desconocido';
    const caja = m.caja || 'Desconocida';
    
    // Filter by box if needed
    if (filterCaja && filterCaja !== 'Todas las Cajas' && filterCaja !== 'Todas las cajas' && caja !== filterCaja) return;

    const key = `${cajero}_${caja}`;
    
    // If we already processed a closed arqueo for this cashier/box, skip individual movements
    // (Legacy logic: Hybrid approach)
    if (datosPorClave[key] && datosPorClave[key].isClosedArqueo) return;

    initKey(key, cajero, caja);
    const d = datosPorClave[key];

    // Cash calc
    let cash = 0;
    if (m.valorVenta > 0) {
        cash = m.valorVenta;
    } else {
        if (m.efectivo) Object.entries(m.efectivo).forEach(([k,v]) => cash += parseInt(k)*v);
        // Foreign currency
        const mon = m.monedasExtranjeras || m.monedas_extranjeras;
        if (mon) {
            ['usd','brl','ars'].forEach(curr => {
                if (mon[curr]) cash += (mon[curr].montoGs || (mon[curr].cantidad * mon[curr].cotizacion) || 0);
            });
        }
    }
    d.efectivoBruto += cash;

    // Services
    let serv = 0;
    if (m.servicios) {
       Object.entries(m.servicios).forEach(([k, s]) => {
         const monto = s.monto || 0;
         serv += monto;
       });
    }
    const others = m.otrosServicios || m.otros_servicios;
    if (others) {
       others.forEach(s => {
         const monto = s.monto || 0;
         serv += monto;
       });
    }
    d.servicios += serv;
  });

  // 2c. Process Egresos for Open Sessions
  egresos.forEach(e => {
    const cajero = e.cajero || e.usuario || 'Desconocido';
    const caja = e.caja || 'Desconocida';
    
    if (filterCaja && filterCaja !== 'Todas las Cajas' && filterCaja !== 'Todas las cajas' && caja !== filterCaja) return;

    const key = `${cajero}_${caja}`;
    if (datosPorClave[key] && datosPorClave[key].isClosedArqueo) return; // Skip in per-cajero table

    initKey(key, cajero, caja); 
    datosPorClave[key].egresos += (e.monto || 0);
  });

  // 2d. Finalize Open Sessions Calculations
  let sumRecaudadoReal = 0;
  let sumIngresoTiendaCalculado = 0;
  Object.values(datosPorClave).forEach(d => {
    if (!d.isClosedArqueo) {
        d.totalDeclarar = d.efectivoBruto + d.egresos;
        d.ingresoTiendaCalculado = d.totalDeclarar - d.servicios - d.fondoFijo;
    }
    
    // Match with saved Recaudacion (Real Count)
    const rec = recaudaciones.find(r => r.cajero === d.nombreCajero && r.caja === d.nombreCaja);
    if (rec) {
        d.recaudadoReal = rec.efectivoIngresado || rec.efectivo_ingresado || 0;
        const diff = d.ingresoTiendaCalculado - d.recaudadoReal;
        if (diff < 0) d.faltante = Math.abs(diff);
        else d.sobrante = diff;
    }
    sumRecaudadoReal += d.recaudadoReal;
    sumIngresoTiendaCalculado += d.ingresoTiendaCalculado;
  });

  return {
    metrics: {
        totalTarjeta,
        totalPedidosYa,
        totalCredito,
        totalTransferencia,
        totalRecaudacionReal: sumRecaudadoReal,
        totalIngresoTiendaSistema: sumIngresoTiendaCalculado,
        totalVentasTienda: sumIngresoTiendaCalculado + totalTarjeta + totalPedidosYa + totalCredito
    },
    summaryData: {
      servicios: serviciosBreakdown,
      ingresosOtros,
      egresos: egresosBreakdown
    },
    tableData: Object.values(datosPorClave).sort((a,b) => a.nombreCajero.localeCompare(b.nombreCajero))
  };
}
