import { getServicioLabel } from './config';

/**
 * Agrupa los servicios por nombre de servicio para el reporte de Resumen Servicios.
 * Obtiene todos los arqueos, extrae el Cajero y la Caja, y suma los montos
 * agrupando por Cajero y Caja, tal como fue solicitado.
 * 
 * @param {Array} arqueos - Lista de arqueos recorridos de la BD.
 * @returns {Object} Datos agrupados por servicio.
 */
export function processServiciosData(movimientos) {
  const grouped = {};
  
  movimientos.forEach(mov => {
    const cajero = mov.cajero || 'Desconocido';
    const serviciosObj = mov.servicios || {};
    
    Object.entries(serviciosObj).forEach(([key, data]) => {
      if (key === 'otros' && typeof data === 'object') {
        Object.entries(data).forEach(([subKey, subData]) => {
          addServiceEntry(subKey, subData, cajero, grouped);
        });
      } else {
        addServiceEntry(key, data, cajero, grouped);
      }
    });

    if (mov.otrosServicios && Array.isArray(mov.otrosServicios)) {
      mov.otrosServicios.forEach(s => {
        addServiceEntry(s.nombre || 'Otros', s, cajero, grouped);
      });
    }
  });

  const sortedResult = {};
  Object.keys(grouped).sort().forEach(label => {
    const serviceData = grouped[label];
    
    const itemsArray = Object.values(serviceData.itemsMap).map(item => ({
      cajero: item.cajero,
      lote: Array.from(item.lotes).join(', ') || '-',
      efectivo: item.efectivo,
      tarjeta: item.tarjeta
    }));

    sortedResult[label] = {
      items: itemsArray,
      totalEfectivo: serviceData.totalEfectivo,
      totalTarjeta: serviceData.totalTarjeta
    };
  });

  return sortedResult;
}

function addServiceEntry(serviceKey, data, cajero, grouped) {
  if (!data) return;

  const label = getServicioLabel(serviceKey).toUpperCase();
  const monto = data.monto || 0;
  const tarjeta = data.tarjeta || 0;
  
  if (monto === 0 && tarjeta === 0) return;

  if (!grouped[label]) {
    grouped[label] = {
      itemsMap: {},
      totalEfectivo: 0,
      totalTarjeta: 0
    };
  }

  const mapKey = cajero;
  if (!grouped[label].itemsMap[mapKey]) {
    grouped[label].itemsMap[mapKey] = {
      cajero,
      lotes: new Set(),
      efectivo: 0,
      tarjeta: 0
    };
  }

  let lotesList = [];
  if (Array.isArray(data.lotes)) {
    lotesList = data.lotes;
  } else if (data.lote) {
    lotesList = [data.lote];
  } else if (data.lotes && typeof data.lotes === 'string') {
    lotesList = [data.lotes];
  }

  lotesList.forEach(l => {
      if (l && l.toString().trim() !== '') {
          grouped[label].itemsMap[mapKey].lotes.add(l.toString().trim());
      }
  });

  grouped[label].itemsMap[mapKey].efectivo += monto;
  grouped[label].itemsMap[mapKey].tarjeta += tarjeta;
  
  grouped[label].totalEfectivo += monto;
  grouped[label].totalTarjeta += tarjeta;
}
