import { supabase } from './supabase';

// Helper for local storage operations with error handling
const localDb = {
  get: (key) => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      console.error(`Error reading ${key} from localStorage`, e);
      return [];
    }
  },
  set: (key, data) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error writing ${key} to localStorage`, e);
    }
  },
  upsert: (key, item, idField = 'id') => {
    const items = localDb.get(key);
    const index = items.findIndex(i => i[idField] === item[idField]);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    localDb.set(key, items);
    return items;
  },
  delete: (key, id, idField = 'id') => {
    const items = localDb.get(key);
    const newItems = items.filter(i => i[idField] !== id);
    localDb.set(key, newItems);
    return newItems;
  }
};

const genId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

// ============================================================
// MAPPERS (Unification Layer)
// Converts between DB (mixed case) and App (CamelCase)
// ============================================================

const mapMovimientoTemporalToDb = (item) => {
  return {
    id: item?.id || genId(),
    fecha: item?.fecha,
    cajero: item?.cajero || item?.usuario || null,
    caja: item?.caja,
    descripcion: item?.descripcion || null,
    valorVenta: item?.valorVenta ?? item?.valor_venta ?? 0,
    efectivo: item?.efectivo || null,
    efectivoVuelto: item?.efectivoVuelto || item?.efectivo_vuelto || null,
    monedasExtranjeras: item?.monedasExtranjeras || item?.monedas_extranjeras || null,
    pagosTarjeta: item?.pagosTarjeta ?? item?.pagos_tarjeta ?? 0,
    ventasCredito: item?.ventasCredito ?? item?.ventas_credito ?? 0,
    pedidosYa: item?.pedidosYa ?? item?.pedidos_ya ?? 0,
    ventas_transferencia: item?.ventasTransferencia ?? item?.ventas_transferencia ?? 0,
    servicios: item?.servicios || null,
    otrosServicios: item?.otrosServicios || item?.otros_servicios || null,
    historialEdiciones: item?.historialEdiciones || item?.historial_ediciones || null,
    arqueado: item?.arqueado ?? false,
    fecha_arqueo: item?.fechaArqueo ?? item?.fecha_arqueo ?? null
  }
}

const mapMovimientoTemporalToApp = (dbItem) => {
  if (!dbItem) return null
  return {
    id: dbItem.id,
    fecha: dbItem.fecha,
    cajero: dbItem.cajero || dbItem.usuario || 'Desconocido',
    usuario: dbItem.usuario || dbItem.cajero || 'Desconocido',
    caja: dbItem.caja,
    descripcion: dbItem.descripcion,
    valorVenta: dbItem.valorVenta ?? dbItem.valor_venta ?? 0,
    efectivo: dbItem.efectivo,
    efectivoVuelto: dbItem.efectivoVuelto ?? dbItem.efectivo_vuelto ?? null,
    monedasExtranjeras: dbItem.monedasExtranjeras ?? dbItem.monedas_extranjeras ?? null,
    pagosTarjeta: dbItem.pagosTarjeta ?? dbItem.pagos_tarjeta ?? 0,
    ventasCredito: dbItem.ventasCredito ?? dbItem.ventas_credito ?? 0,
    pedidosYa: dbItem.pedidosYa ?? dbItem.pedidos_ya ?? 0,
    ventasTransferencia: dbItem.ventas_transferencia ?? dbItem.ventasTransferencia ?? 0,
    servicios: dbItem.servicios,
    otrosServicios: dbItem.otrosServicios ?? dbItem.otros_servicios ?? null,
    historialEdiciones: dbItem.historialEdiciones ?? dbItem.historial_ediciones ?? [],
    arqueado: dbItem.arqueado ?? false,
    fechaArqueo: dbItem.fecha_arqueo ?? dbItem.fechaArqueo ?? null
  }
}

const mapEgresoToDb = (eg) => {
  return {
    id: eg?.id || genId(),
    fecha: eg?.fecha,
    caja: eg?.caja,
    cajero: eg?.cajero || null,
    categoria: eg?.categoria,
    descripcion: eg?.descripcion,
    monto: eg?.monto || 0,
    referencia: eg?.referencia || null,
    efectivo: typeof eg?.efectivo === 'number' ? eg.efectivo : (eg?.efectivo?.total || 0),
    receptor: eg?.receptor || null,
    numero_recibo: eg?.numeroRecibo || eg?.numero_recibo || null,
    arqueado: eg?.arqueado || false,
    fecha_arqueo: eg?.fechaArqueo || eg?.fecha_arqueo || null,
    usuario_id: eg?.usuarioId || eg?.usuario_id || null,
    moneda: eg?.moneda || 'gs'
  }
}

const mapEgresoToApp = (dbItem) => {
  if (!dbItem) return null
  return {
    id: dbItem.id,
    fecha: dbItem.fecha,
    caja: dbItem.caja,
    cajero: dbItem.cajero || dbItem.usuario || 'Desconocido',
    usuario: dbItem.usuario || dbItem.cajero || 'Desconocido',
    categoria: dbItem.categoria,
    descripcion: dbItem.descripcion,
    monto: dbItem.monto,
    referencia: dbItem.referencia,
    efectivo: dbItem.efectivo,
    receptor: dbItem.receptor,
    numeroRecibo: dbItem.numero_recibo ?? dbItem.numeroRecibo ?? null,
    arqueado: dbItem.arqueado ?? false,
    fechaArqueo: dbItem.fecha_arque_o ?? dbItem.fecha_arqueo ?? dbItem.fechaArqueo ?? null,
    usuarioId: dbItem.usuario_id ?? dbItem.usuarioId ?? null,
    moneda: dbItem.moneda
  }
}

const mapOperacionToDb = (op) => {
  return {
    id: op?.id || genId(),
    fecha: op?.fecha,
    cajero: op?.cajero || null,
    tipo: op?.tipo,
    "historialEdiciones": op?.historialEdiciones || op?.historial_ediciones || [],
    receptor: op?.receptor || null,
    descripcion: op?.descripcion,
    "numeroRecibo": op?.numeroRecibo ?? op?.numero_recibo ?? null,
    monto: op?.monto,
    moneda: op?.moneda || 'gs',
    caja: op?.caja || null,
    referencia: op?.referencia || null,
    arqueado: op?.arqueado ?? false,
    fecha_arqueo: op?.fechaArqueo ?? op?.fecha_arqueo ?? null,
    categoria: op?.categoria || null,
    usuario_id: op?.usuarioId ?? op?.usuario_id ?? null
  }
}

const mapOperacionToApp = (dbItem) => {
  if (!dbItem) return null
  return {
    id: dbItem.id,
    fecha: dbItem.fecha,
    cajero: dbItem.cajero || dbItem.usuario || 'Desconocido',
    usuario: dbItem.usuario || dbItem.cajero || 'Desconocido',
    tipo: dbItem.tipo,
    historialEdiciones: dbItem["historialEdiciones"] ?? dbItem.historial_ediciones ?? [],
    receptor: dbItem.receptor,
    descripcion: dbItem.descripcion,
    numeroRecibo: dbItem["numeroRecibo"] ?? dbItem.numero_recibo ?? null,
    monto: dbItem.monto,
    moneda: dbItem.moneda,
    caja: dbItem.caja,
    referencia: dbItem.referencia,
    arqueado: dbItem.arqueado ?? false,
    fechaArqueo: dbItem.fecha_arqueo ?? dbItem.fechaArqueo ?? null,
    categoria: dbItem.categoria,
    usuarioId: dbItem.usuario_id ?? dbItem.usuarioId ?? null
  }
}

const mapArqueoToDb = (a) => {
  const arqueoDb = {
    fecha: a?.fecha,
    cajero: a?.cajero,
    caja: a?.caja,
    fondo_fijo: a?.fondoFijo ?? a?.fondo_fijo ?? 0,
    cotizaciones: a?.cotizaciones || null,
    efectivo: a?.efectivo || null,
    dolares: a?.dolares || null,
    reales: a?.reales || null,
    pesos: a?.pesos || null,
    total_efectivo: a?.totalEfectivo ?? a?.total_efectivo ?? 0,
    pagos_tarjeta: a?.pagosTarjeta ?? a?.pagos_tarjeta ?? 0,
    ventas_credito: a?.ventasCredito ?? a?.ventas_credito ?? 0,
    pedidos_ya: a?.pedidosYa ?? a?.pedidos_ya ?? 0,
    ventas_transferencia: a?.ventasTransferencia ?? a?.ventas_transferencia ?? 0,
    servicios: a?.servicios || null,
    total_servicios: a?.totalServicios ?? a?.total_servicios ?? 0,
    total_ingresos: a?.totalIngresos ?? a?.total_ingresos ?? 0,
    total_egresos: a?.totalEgresos ?? a?.total_egresos ?? 0,
    total_movimientos: a?.totalMovimientos ?? a?.total_movimientos ?? 0,
    saldo_caja: a?.saldoCaja ?? a?.saldo_caja ?? 0,
    diferencia: a?.diferencia ?? 0,
    observaciones: a?.observaciones || null,
    total_ingresos_tienda: a?.totalIngresosTienda ?? a?.total_ingresos_tienda ?? 0,
    usuario_id: a?.usuarioId || a?.usuario_id || null
  }

  // Only include ID if it already exists (for updates)
  // For new inserts, we let Supabase generate the UUID
  if (a?.id) {
    arqueoDb.id = a.id
  }

  return arqueoDb
}

const mapArqueoToApp = (dbItem) => {
  if (!dbItem) return null
  return {
    id: dbItem.id,
    fecha: dbItem.fecha,
    cajero: dbItem.cajero,
    caja: dbItem.caja,
    fondoFijo: dbItem.fondo_fijo ?? 0,
    cotizaciones: dbItem.cotizaciones,
    efectivo: dbItem.efectivo,
    dolares: dbItem.dolares,
    reales: dbItem.reales,
    pesos: dbItem.pesos,
    totalEfectivo: dbItem.total_efectivo ?? 0,
    pagosTarjeta: dbItem.pagos_tarjeta ?? 0,
    ventasCredito: dbItem.ventas_credito ?? 0,
    pedidosYa: dbItem.pedidos_ya ?? 0,
    ventasTransferencia: dbItem.ventas_transferencia ?? 0,
    servicios: dbItem.servicios,
    totalServicios: dbItem.total_servicios ?? 0,
    totalIngresos: dbItem.total_ingresos ?? 0,
    totalEgresos: dbItem.total_egresos ?? 0,
    totalMovimientos: dbItem.total_movimientos ?? 0,
    saldoCaja: dbItem.saldo_caja ?? 0,
    diferencia: dbItem.diferencia ?? 0,
    observaciones: dbItem.observaciones,
    totalIngresosTienda: dbItem.total_ingresos_tienda ?? 0,
    usuarioId: dbItem.usuario_id ?? null
  }
}

const pick = (obj, keys) => {
  const out = {}
  keys.forEach(k => {
    if (obj && obj[k] !== undefined) out[k] = obj[k]
  })
  return out
}

export const db = {
  // ===== GENERIC RANGE FETCHING =====
  async getDataRange(table, startDate, endDate, caja = null) {
    let query = supabase
      .from(table)
      .select('*')
      .gte('fecha', startDate)
      .lte('fecha', `${endDate}T23:59:59`)
      .order('fecha', { ascending: false });

    if (caja && caja !== 'Todas las Cajas' && caja !== 'Todas las cajas') {
      query = query.eq('caja', caja);
    }

    const { data, error } = await query;
    if (!error) return { success: true, data };

    // Offline Fallback
    const all = localDb.get(table === 'egresos_caja' ? 'egresosCaja' : 
                           table === 'movimientos_temporales' ? 'movimientosTemporales' : 
                           table); // Mapping keys
    
    const filtered = all.filter(i => {
      const d = i.fecha.split('T')[0];
      const matchDate = d >= startDate && d <= endDate;
      const matchCaja = !caja || caja === 'Todas las Cajas' || caja === 'Todas las cajas' || i.caja === caja;
      return matchDate && matchCaja;
    });
    
    return { success: true, data: filtered };
  },

  // ===== AUTHENTICATION =====
  // Handled mostly by Supabase Auth Context, but specific DB operations here
  
  async createUserProfile(userId, username, role = 'cajero') {
    const { error } = await supabase
      .from('perfiles_usuarios')
      .update({ rol: role })
      .eq('id', userId);
      
    if (error) console.warn('Error assigning role:', error);
    return { success: !error, error };
  },

  // ===== EGRESOS CAJA =====
  async getNextReceiptNumber() {
    const { data, error } = await supabase
      .from('egresos_caja')
      .select('numero_recibo')
      .not('numero_recibo', 'is', null)
      .order('numero_recibo', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching next receipt number:', error);
      return 1;
    }

    if (data && data.length > 0) {
      return (parseInt(data[0].numero_recibo) || 0) + 1;
    }

    return 1;
  },

  async saveEgreso(egreso) {
    const egresoDb = mapEgresoToDb(egreso)
    
    const { data, error } = await supabase
      .from('egresos_caja')
      .upsert([egresoDb])
      .select();

    if (!error) return { success: true, data: data[0] ? mapEgresoToApp(data[0]) : null };

    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (isOffline) {
      const offlineItem = { ...egresoDb, pending_sync: true }
      localDb.upsert('egresosCaja', offlineItem)
      return { success: true, offline: true, error: error.message }
    }

    return { success: false, error: error.message }
  },

  async getEgresos(date = null, caja = null) {
    let query = supabase
      .from('egresos_caja')
      .select('*')
      .order('fecha', { ascending: false });

    if (date) {
      query = query
        .gte('fecha', date)
        .lt('fecha', `${date}T23:59:59`);
    }

    if (caja && caja !== 'Todas las cajas') {
      query = query.eq('caja', caja);
    }

    const { data, error } = await query;

    if (!error) return { success: true, data: data.map(mapEgresoToApp) };

    // Offline Fallback
    console.warn('Offline: Getting egresos locally');
    const all = localDb.get('egresosCaja');
    const filtered = all.filter(e => 
      (!date || (e.fecha && e.fecha.startsWith(date))) &&
      (!caja || caja === 'Todas las cajas' || e.caja === caja)
    );
    return { success: true, data: filtered };
  },

  async deleteEgreso(id) {
    const { error } = await supabase
      .from('egresos_caja')
      .delete()
      .eq('id', id);

    if (!error) return { success: true };

    // Offline Fallback
    console.warn('Offline: Deleting egreso locally');
    localDb.delete('egresosCaja', id);
    return { success: true, offline: true };
  },

  // ===== MOVIMIENTOS (General) =====
  async getNextMovimientoReceiptNumber() {
    const { data, error } = await supabase
      .from('movimientos')
      .select('"numeroRecibo"')
      .not('"numeroRecibo"', 'is', null)
      .order('numeroRecibo', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching next movement receipt number:', error);
      return 1;
    }

    if (data && data.length > 0) {
      return (parseInt(data[0]["numeroRecibo"]) || 0) + 1;
    }

    return 1;
  },

  async saveMovimiento(movimiento) {
    const movimientoDb = mapOperacionToDb(movimiento)
    
    const { data, error } = await supabase
      .from('movimientos')
      .upsert([movimientoDb])
      .select();

    if (!error) return { success: true, data: data[0] ? mapOperacionToApp(data[0]) : null };

    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (isOffline) {
      const offlineItem = { ...movimientoDb, pending_sync: true }
      localDb.upsert('movimientos', offlineItem)
      return { success: true, offline: true, error: error.message }
    }

    return { success: false, error: error.message }
  },

  async getMovimientos(date = null, caja = null) {
    let query = supabase
      .from('movimientos')
      .select('*')
      .order('fecha', { ascending: false });

    if (date) {
      query = query
        .gte('fecha', date)
        .lt('fecha', `${date}T23:59:59`);
    }

    if (caja && caja !== 'Todas las cajas') {
      query = query.eq('caja', caja);
    }

    const { data, error } = await query;

    if (!error) return { success: true, data: data.map(mapOperacionToApp) };

    const all = localDb.get('movimientos');
    const filtered = all.filter(m => 
      (!date || (m.fecha && m.fecha.startsWith(date))) &&
      (!caja || caja === 'Todas las cajas' || m.caja === caja)
    );
    return { success: true, data: filtered };
  },

  async deleteMovimiento(id) {
    const { error } = await supabase
      .from('movimientos')
      .delete()
      .eq('id', id);

    if (!error) return { success: true };

    localDb.delete('movimientos', id);
    return { success: true, offline: true };
  },

  // ===== MOVIMIENTOS TEMPORALES (Ingresos Dashboard) =====
  async saveMovimientoTemporal(item) {
    const itemDb = mapMovimientoTemporalToDb(item)

    const { data, error } = await supabase
      .from('movimientos_temporales')
      .upsert([itemDb])
      .select();

    if (!error) return { success: true, data: data[0] ? mapMovimientoTemporalToApp(data[0]) : null };

    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (isOffline) {
      const offlineItem = { ...itemDb, pending_sync: true }
      localDb.upsert('movimientosTemporales', offlineItem)
      return { success: true, offline: true, error: error.message }
    }

    return { success: false, error: error.message }
  },

  async getMovimientosTemporales(date = null, caja = null) {
    let query = supabase
      .from('movimientos_temporales')
      .select('*')
      .order('fecha', { ascending: false });

    if (date) {
      query = query
        .gte('fecha', date)
        .lt('fecha', `${date}T23:59:59`);
    }
    if (caja && caja !== 'Todas las cajas') {
      query = query.eq('caja', caja);
    }

    const { data, error } = await query;

    if (!error) return { success: true, data: data.map(mapMovimientoTemporalToApp) };

    const all = localDb.get('movimientosTemporales');
    const filtered = all.filter(m => 
      (!date || (m.fecha && m.fecha.startsWith(date))) &&
      (!caja || caja === 'Todas las cajas' || m.caja === caja)
    );
    return { success: true, data: filtered };
  },

  async deleteMovimientoTemporal(id) {
    const { error } = await supabase
      .from('movimientos_temporales')
      .delete()
      .eq('id', id);

    if (!error) return { success: true };

    localDb.delete('movimientosTemporales', id);
    return { success: true, offline: true };
  },

  // ===== ARQUEOS =====
  async saveArqueo(arqueo, userId) {
    if (!userId) {
       const user = JSON.parse(localStorage.getItem('usuario_actual'));
       userId = user?.id;
    }

    const arqueoDb = mapArqueoToDb({ ...arqueo, usuario_id: userId })

    const { data, error } = await supabase
      .from('arqueos')
      .insert([arqueoDb])
      .select()
    if (!error) {
      const savedArqueo = data[0] ? mapArqueoToApp(data[0]) : null;
      if (savedArqueo) {
        // Envolvemos en try/catch interno o simplemente esperamos, 
        // ya que el arqueo en sí ya se guardó.
        await this.updateRelatedMovementsStatus(arqueo.fecha, arqueo.caja, true);
      }
      return { success: true, data: savedArqueo };
    }

    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (isOffline) {
      const offlineItem = { ...arqueoDb, pending_sync: true }
      localDb.upsert('arqueos', offlineItem)
      return { success: true, offline: true, error: error.message }
    }

    return { success: false, error: error.message }
  },

  async getArqueos(date = null, caja = null) {
    let query = supabase
      .from('arqueos')
      .select('*')
      .order('fecha', { ascending: false });

    if (date) {
      query = query
        .gte('fecha', date)
        .lte('fecha', `${date}T23:59:59`);
    }
    if (caja) {
      query = query.eq('caja', caja);
    }

    const { data, error } = await query;

    if (!error) return { success: true, data: data.map(mapArqueoToApp) };

    const all = localDb.get('arqueos');
    const filtered = all.filter(a => 
      (!date || (a.fecha && a.fecha.startsWith(date))) &&
      (!caja || a.caja === caja)
    );
    return { success: true, data: filtered };
  },

  async updateArqueo(id, arqueo) {
    const arqueoDb = mapArqueoToDb(arqueo)
    arqueoDb.actualizado_en = new Date().toISOString()

    const { data, error } = await supabase
      .from('arqueos')
      .update(arqueoDb)
      .eq('id', id)
      .select()

    if (!error) {
      const updatedArqueo = data[0] ? mapArqueoToApp(data[0]) : null;
      if (updatedArqueo) {
        await this.updateRelatedMovementsStatus(arqueo.fecha, arqueo.caja, true);
      }
      return { success: true, data: updatedArqueo };
    }

    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (isOffline) {
      const offlineItem = { ...arqueoDb, id, pending_sync: true }
      localDb.upsert('arqueos', offlineItem)
      return { success: true, offline: true, error: error.message }
    }

    return { success: false, error: error.message }
  },

  // ===== SYNC =====
  async syncOfflineData() {
    if (typeof window === 'undefined' || !navigator.onLine) return { synced: 0 };

    let totalSynced = 0;
    const collections = [
      { key: 'arqueos', table: 'arqueos' },
      { key: 'movimientos', table: 'movimientos' },
      { key: 'egresosCaja', table: 'egresos_caja' },
      { key: 'movimientosTemporales', table: 'movimientos_temporales' },
      { key: 'recaudacion', table: 'recaudacion' }
    ];

    for (const { key, table } of collections) {
      const items = localDb.get(key);
      const pending = items.filter(i => i.pending_sync === true);
      
      if (pending.length === 0) continue;

      for (const item of pending) {
        const { pending_sync, ...itemClean } = item;
        delete itemClean.user_id; // Let RLS/Defaults handle this if needed, or pass explicitly

        const { error } = await supabase.from(table).upsert(itemClean);
        
        if (!error) {
          // Update local item to remove pending flag
          item.pending_sync = false;
          totalSynced++;
        } else {
          console.error(`Error syncing ${key} item:`, error);
        }
      }
      
      // Save back updated items (with pending_sync removed)
      localDb.set(key, items);
    }

    return { synced: totalSynced };
  },

  // ===== RECAUDACION (Resumen) =====
  async guardarRecaudacion(fecha, cajero, caja, efectivoIngresado) {
    const item = {
      fecha,
      cajero,
      caja,
      efectivo_ingresado: efectivoIngresado,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('recaudacion')
      .upsert([item], { onConflict: 'fecha, cajero, caja' })
      .select();

    if (!error) return { success: true, data: data[0] };

    // Offline Fallback
    console.warn('Offline: Saving recaudacion locally');
    const offlineItem = { ...item, pending_sync: true };
    // We need to handle upsert locally too
    const current = localDb.get('recaudacion');
    const index = current.findIndex(i => i.fecha === fecha && i.cajero === cajero && i.caja === caja);
    if (index >= 0) {
      current[index] = offlineItem;
    } else {
      current.push(offlineItem);
    }
    localDb.set('recaudacion', current);
    
    return { success: true, offline: true, error };
  },

  async obtenerRecaudacion(fecha, cajero = null, caja = null) {
    let query = supabase
      .from('recaudacion')
      .select('*')
      .eq('fecha', fecha);

    if (cajero) query = query.eq('cajero', cajero);
    if (caja) query = query.eq('caja', caja);

    const { data, error } = await query;

    if (!error) return data || [];

    // Offline Fallback
    const all = localDb.get('recaudacion');
    const filtered = all.filter(r => 
      r.fecha === fecha &&
      (!cajero || r.cajero === cajero) &&
      (!caja || r.caja === caja)
    );
    return filtered;
  },

  // ===== COTIZACIONES =====
  async getCotizaciones() {
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*')
      .order('actualizado_en', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) return { success: true, data };
    
    // Fallback if table is empty or error
    return { success: false, data: { usd: 7000, brl: 1250, ars: 0 } };
  },

  async saveCotizaciones(cotData) {
    // We try to update the first record or insert if none exists
    const { data: existing } = await supabase.from('cotizaciones').select('id').limit(1);
    
    const payload = {
      usd: parseInt(cotData.usd) || 0,
      brl: parseInt(cotData.brl) || 0,
      ars: parseInt(cotData.ars) || 0,
      actualizado_en: new Date().toISOString()
    };

    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from('cotizaciones')
        .update(payload)
        .eq('id', existing[0].id)
        .select();
      return { success: !error, data: data?.[0], error };
    } else {
      const { data, error } = await supabase
        .from('cotizaciones')
        .insert([payload])
        .select();
      return { success: !error, data: data?.[0], error };
    }
  },

  // ===== TOTAL GENERAL (Saldos Históricos) =====
  async getTotalGeneral(fecha, caja) {
    const { data, error } = await supabase
      .from('total_general')
      .select('total')
      .eq('fecha', fecha)
      .eq('caja', caja)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
      console.error('Error fetching total general:', error);
    }

    return { success: !error, data };
  },

  async saveTotalGeneral(fecha, caja, total) {
    const { data, error } = await supabase
      .from('total_general')
      .upsert({
        fecha,
        caja,
        total,
        updated_at: new Date().toISOString()
      }, { onConflict: 'fecha, caja' })
      .select();

    return { success: !error, data: data?.[0], error };
  },

  async getDataRange(tableName, startDate, endDate, caja) {
    let query = supabase.from(tableName).select('*')
    
    // Date filter (inclusive)
    query = query.gte('fecha', `${startDate}T00:00:00`)
                 .lte('fecha', `${endDate}T23:59:59`)

    if (caja && caja !== 'Todas las cajas' && caja !== 'Todas las Cajas') {
      query = query.eq('caja', caja)
    }

    const { data, error } = await query

    if (error) {
      console.error(`Error fetching range for ${tableName}:`, error)
      return { success: false, data: [], error }
    }

    // Apply mappers if needed
    let mappedData = data
    if (tableName === 'arqueos') mappedData = data.map(mapArqueoToApp)
    if (tableName === 'movimientos_temporales') mappedData = data.map(mapMovimientoTemporalToApp)
    if (tableName === 'movimientos') mappedData = data.map(mapOperacionToApp)
    if (tableName === 'egresos_caja') mappedData = data.map(mapEgresoToApp)

    return { success: true, data: mappedData }
  },

  async getFondoFijo(caja) {
    if (!caja) return { success: false, data: 0 };
    const { data, error } = await supabase
      .from('config_cajas')
      .select('fondo_fijo')
      .eq('caja', caja)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching fondo fijo:', error);
      return { success: false, data: 0, error };
    }
    return { success: true, data: data?.fondo_fijo || 0 };
  },

  async setFondoFijo(caja, monto) {
    if (!caja) return { success: false };
    const { data, error } = await supabase
      .from('config_cajas')
      .upsert({ 
        caja, 
        fondo_fijo: monto, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'caja' })
      .select();

    return { success: !error, data: data?.[0], error };
  },

  // ===== DEPOSITOS SERVICIOS =====
  async getDepositosServicios(fecha, caja) {
    let query = supabase
      .from('depositos_servicios')
      .select('*')
      .eq('fecha', fecha);
      
    // Si la caja seleccionada es la vista general, buscamos específicamente los datos de Tesorería
    if (!caja || caja === 'Todas las Cajas' || caja === 'Todas las cajas') {
        query = query.eq('caja', 'Tesoreria');
    } else {
        query = query.eq('caja', caja);
    }
    
    const { data, error } = await query;
    if (error) console.error('Error fetching depositos:', error);
    return { success: !error, data: data || [] };
  },

  async saveDepositosServicios(fecha, caja, servicios) {
    // Si la caja no se especifica o es "Todas las cajas", lo guardamos como un registro global en Tesoreria.
    const cajaDestino = (!caja || caja === 'Todas las cajas' || caja === 'Todas las Cajas') 
      ? 'Tesoreria' 
      : caja;
    
    const item = {
      fecha,
      caja: cajaDestino,
      servicios,
      actualizado_en: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('depositos_servicios')
      .upsert(item, { onConflict: 'fecha, caja' })
      .select();

    if (error) console.error('Error saving depositos:', error);
    return { success: !error, data: data?.[0], error };
  },

  async updateRelatedMovementsStatus(date, caja, status = true) {
    if (!date || !caja) return;

    // Normalize date (ensure it's just the YYYY-MM-DD part)
    const dateOnly = String(date).split('T')[0];
    const range = {
      start: `${dateOnly}T00:00:00`,
      end: `${dateOnly}T23:59:59`
    };

    const tables = ['movimientos_temporales', 'egresos_caja', 'movimientos'];
    
    try {
      await Promise.all(tables.map(table => 
        supabase
          .from(table)
          .update({ 
            arqueado: status, 
            fecha_arqueo: status ? new Date().toISOString() : null 
          })
          .eq('caja', caja)
          .gte('fecha', range.start)
          .lte('fecha', range.end)
      ));
    } catch (err) {
      console.error('Error updating related movements status:', err);
    }
  }
};
