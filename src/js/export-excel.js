// **NUEVO:** Función para exportar Resumen Tesorería a Excel
window.exportarResumenAExcel = function () {
    try {
        // Obtener filtros aplicados
        const fechaDesde = document.getElementById('fechaResumenDesde')?.value || 'Todas';
        const fechaHasta = document.getElementById('fechaResumenHasta')?.value || 'Todas';
        const cajaFiltro = document.getElementById('filtroCajaGeneral')?.value || 'Todas las Cajas';

        // Crear un nuevo workbook
        const wb = XLSX.utils.book_new();

        // Array para almacenar todas las filas de la hoja
        const data = [];
        let currentRow = 0;

        // ===== ENCABEZADO =====
        data[currentRow++] = ['RESUMEN TESORERÍA'];
        data[currentRow++] = [`Período: ${fechaDesde} - ${fechaHasta}`];
        data[currentRow++] = [`Caja: ${cajaFiltro}`];
        data[currentRow++] = []; // Fila vacía

        // ===== SECCIÓN 1: RECAUDACIONES =====
        data[currentRow++] = ['RECAUDACIONES'];
        data[currentRow++] = ['CAJERO', 'Total Ingresos Tienda', 'EFECTIVO', 'SOBRANTE', 'FALTANTE', 'SubTotales/user'];

        // Obtener datos de la tabla de recaudaciones
        const tbodyRecaudacion = document.getElementById('tbodyRecaudacion');
        if (tbodyRecaudacion) {
            const rows = tbodyRecaudacion.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    const rowData = [
                        cells[0].textContent.trim(),
                        parsearMoneda(cells[1].textContent),
                        parsearMoneda(cells[2].querySelector('input')?.value || cells[2].textContent),
                        parsearMoneda(cells[3].textContent),
                        parsearMoneda(cells[4].textContent),
                        parsearMoneda(cells[5].textContent)
                    ];
                    data[currentRow++] = rowData;
                }
            });
        }

        // Fila de totales de recaudaciones
        const rowTotalRecaudacion = document.getElementById('rowTotalRecaudacion');
        if (rowTotalRecaudacion) {
            const cells = rowTotalRecaudacion.querySelectorAll('td');
            if (cells.length >= 6) {
                data[currentRow++] = [
                    'TOTAL RECAUDADO:',
                    parsearMoneda(cells[1].textContent),
                    parsearMoneda(cells[2].textContent),
                    parsearMoneda(cells[3].textContent),
                    parsearMoneda(cells[4].textContent),
                    parsearMoneda(cells[5].textContent)
                ];
            }
        }

        data[currentRow++] = []; // Fila vacía

        // ===== SECCIÓN 2: PAGOS/EGRESOS =====
        data[currentRow++] = ['PAGOS / EGRESOS'];
        data[currentRow++] = ['CAJERO', 'CATEGORÍA', 'DESCRIPCIÓN', 'MONTO'];

        // Obtener datos de la tabla de pagos/egresos
        const tbodyPagosEgresos = document.getElementById('tbodyPagosEgresos');
        if (tbodyPagosEgresos) {
            const rows = tbodyPagosEgresos.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) {
                    const rowData = [
                        cells[0].textContent.trim(),
                        cells[1].textContent.trim(),
                        cells[2].textContent.trim(),
                        parsearMoneda(cells[3].textContent)
                    ];
                    data[currentRow++] = rowData;
                }
            });
        }

        // Fila de total de egresos
        const tfootPagosEgresos = document.getElementById('tfootPagosEgresos');
        if (tfootPagosEgresos) {
            const totalRow = tfootPagosEgresos.querySelector('tr');
            if (totalRow) {
                const cells = totalRow.querySelectorAll('td');
                if (cells.length >= 4) {
                    data[currentRow++] = [
                        '',
                        '',
                        'TOTAL:',
                        parsearMoneda(cells[3].textContent)
                    ];
                }
            }
        }

        data[currentRow++] = []; // Fila vacía

        // ===== SECCIÓN 3: INGRESOS/EGRESOS =====
        data[currentRow++] = ['INGRESOS / EGRESOS'];
        data[currentRow++] = ['INGRESOS', '', 'EGRESOS', ''];

        // Obtener datos de la tabla de ingresos/egresos
        const tbodyIngresosEgresos = document.getElementById('tbodyIngresosEgresos');
        if (tbodyIngresosEgresos) {
            const rows = tbodyIngresosEgresos.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    // Extraer texto y monto de cada celda
                    const ingresoDiv = cells[0].querySelector('div');
                    const egresoDiv = cells[1].querySelector('div');

                    let ingresoTexto = '', ingresoMonto = '';
                    let egresoTexto = '', egresoMonto = '';

                    if (ingresoDiv) {
                        const spans = ingresoDiv.querySelectorAll('span');
                        if (spans.length >= 2) {
                            ingresoTexto = spans[0].textContent.trim();
                            ingresoMonto = parsearMoneda(spans[1].textContent);
                        }
                    }

                    if (egresoDiv) {
                        const spans = egresoDiv.querySelectorAll('span');
                        if (spans.length >= 2) {
                            egresoTexto = spans[0].textContent.trim();
                            egresoMonto = parsearMoneda(spans[1].textContent);
                        }
                    }

                    data[currentRow++] = [ingresoTexto, ingresoMonto, egresoTexto, egresoMonto];
                }
            });
        }

        // Crear la hoja de cálculo
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Aplicar estilos y formato
        const range = XLSX.utils.decode_range(ws['!ref']);

        // Ajustar anchos de columna
        ws['!cols'] = [
            { wch: 25 }, // Columna A
            { wch: 20 }, // Columna B
            { wch: 25 }, // Columna C
            { wch: 15 }  // Columna D
        ];

        // Agregar la hoja al workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Resumen Tesorería');

        // Generar nombre de archivo con fecha
        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = `Resumen_Tesoreria_${fecha}.xlsx`;

        // Descargar el archivo
        XLSX.writeFile(wb, nombreArchivo);

        mostrarNotificacion('Excel exportado exitosamente', 'exito');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        mostrarNotificacion('Error al exportar a Excel: ' + error.message, 'error');
    }
};
