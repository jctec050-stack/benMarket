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

// **NUEVO:** Función para exportar Resumen a PDF (Captura de Pantalla)
window.exportarResumenAPDF = function () {
    // Verificar que jspdf y html2canvas estén cargados
    if (!window.jspdf || !window.html2canvas) {
        mostrarNotificacion('Librerías de PDF no cargadas. Recarga la página.', 'error');
        return;
    }

    const element = document.querySelector('section#resumen'); // Capturamos toda la sección resumen
    if (!element) return;

    const btnExcel = document.getElementById('btnExportarExcel');
    const btnPDF = document.getElementById('btnExportarPDF');
    
    // Ocultar botones temporalmente
    if(btnExcel) btnExcel.style.display = 'none';
    if(btnPDF) btnPDF.style.display = 'none';

    // Mostrar notificación de carga
    const btnOriginalText = btnPDF ? btnPDF.textContent : '';
    if(btnPDF) btnPDF.textContent = 'Generando...';

    // Usar html2canvas con configuración optimizada para contraste
    html2canvas(element, {
        scale: 2, // Reducimos a 2 para evitar problemas de memoria/rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // Fondo blanco sólido
        imageTimeout: 0,
        onclone: (clonedDoc) => {
            // Ajustes en el clon para mejorar la legibilidad en PDF
            const clonedEl = clonedDoc.querySelector('section#resumen');
            if (clonedEl) {
                // Asegurar fondo blanco y texto oscuro
                clonedEl.style.backgroundColor = '#ffffff';
                clonedEl.style.color = '#000000';
                
                // Eliminar sombras que pueden verse borrosas o claras
                const elementsWithShadow = clonedEl.querySelectorAll('*');
                elementsWithShadow.forEach(el => {
                    el.style.boxShadow = 'none';
                    el.style.textShadow = 'none';
                    
                    // Si el elemento tiene texto gris claro, oscurecerlo
                    const computedStyle = window.getComputedStyle(el);
                    if (computedStyle.color === 'rgb(100, 116, 139)') { // #64748b (slate-500)
                        el.style.color = '#333333';
                    }
                    if (computedStyle.color === 'rgb(148, 163, 184)') { // #94a3b8 (slate-400)
                        el.style.color = '#555555';
                    }
                });
            }
        }
    }).then(canvas => {
        // Restaurar botones
        if(btnExcel) btnExcel.style.display = '';
        if(btnPDF) {
            btnPDF.style.display = '';
            btnPDF.textContent = btnOriginalText;
        }

        // Volver a PNG que tiene mejor calidad para texto/líneas que JPEG
        const imgData = canvas.toDataURL('image/png');
        
        // Crear PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        // Agregar primera página
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Agregar páginas extra si es muy largo
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        // Descargar
        const fecha = new Date().toISOString().split('T')[0];
        pdf.save(`Resumen_Tesoreria_${fecha}.pdf`);
        
        mostrarNotificacion('PDF generado correctamente', 'success');

    }).catch(err => {
        console.error('Error generando PDF:', err);
        mostrarNotificacion('Error al generar PDF', 'error');
        
        // Restaurar botones en caso de error
        if(btnExcel) btnExcel.style.display = '';
        if(btnPDF) {
            btnPDF.style.display = '';
            btnPDF.textContent = btnOriginalText;
        }
    });
};
