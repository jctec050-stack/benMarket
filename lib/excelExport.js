import * as XLSX from 'xlsx';
import { formatCurrency } from './utils';

export function exportResumenExcel(tableData, metrics, dateRange) {
  const wb = XLSX.utils.book_new();
  
  // 1. Prepare Summary Sheet
  const summaryRows = [
    ['Resumen de Tesorería'],
    [`Desde: ${dateRange.start}`, `Hasta: ${dateRange.end}`],
    [''],
    ['Métricas Generales'],
    ['Total Tarjeta', metrics.totalTarjeta],
    ['Pedidos Ya', metrics.totalPedidosYa],
    ['Ventas Crédito', metrics.totalCredito],
    [''],
    ['Detalle por Cajero']
  ];

  // Header for Table
  summaryRows.push(['Cajero', 'Caja', 'Total Ingresos Tienda', 'Efectivo IGNIS', 'Sobrante', 'Faltante']);

  tableData.forEach(row => {
    summaryRows.push([
      row.nombreCajero,
      row.nombreCaja,
      row.ingresoTiendaCalculado,
      row.recaudadoReal,
      row.sobrante,
      row.faltante
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  // Save
  XLSX.writeFile(wb, `Resumen_Tesoreria_${dateRange.start}.xlsx`);
}
