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
// **NUEVO:** Función para exportar Resumen a PDF (Nativo con jsPDF + AutoTable)
window.exportarResumenAPDF = function () {
    // Verificar que jspdf y autotable estén cargados
    if (!window.jspdf || !window.jspdf.jsPDF) {
        mostrarNotificacion('Librerías de PDF no cargadas. Recarga la página.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Configuración de márgenes
    const marginX = 14;
    let finalY = 20;

    // --- ENCABEZADO ---
    // Título Principal
    doc.setFontSize(18);
    doc.text('RESUMEN DE TESORERÍA', pageWidth / 2, finalY, { align: 'center' });
    finalY += 10;

    // Información del Reporte
    doc.setFontSize(10);
    const fechaDesde = document.getElementById('fechaResumenDesde')?.value || 'Todas';
    const fechaHasta = document.getElementById('fechaResumenHasta')?.value || 'Todas';
    const cajaFiltro = document.getElementById('filtroCajaGeneral')?.value || 'Todas las Cajas';
    const usuario = sessionStorage.getItem('usuarioActual') || 'Usuario';
    const fechaGeneracion = new Date().toLocaleString('es-PY');

    doc.text(`Período: ${fechaDesde} al ${fechaHasta}`, marginX, finalY);
    doc.text(`Generado por: ${usuario}`, pageWidth - marginX, finalY, { align: 'right' });
    finalY += 6;
    doc.text(`Caja: ${cajaFiltro}`, marginX, finalY);
    doc.text(`Fecha: ${fechaGeneracion}`, pageWidth - marginX, finalY, { align: 'right' });
    finalY += 10;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(marginX, finalY, pageWidth - marginX, finalY);
    finalY += 10;

    // --- SECCIÓN 1: DASHBOARD DE MÉTRICAS (Resumen Rápido) ---
    doc.setFontSize(14);
    doc.text('Métricas Principales', marginX, finalY);
    finalY += 8;

    const totalTarjeta = document.getElementById('metricTotalTarjeta')?.textContent || '0';
    const totalPedidosYa = document.getElementById('metricTotalPedidosYa')?.textContent || '0';
    const totalCredito = document.getElementById('metricTotalCredito')?.textContent || '0';

    // Dibujar cajitas simples para las métricas
    const boxWidth = (pageWidth - (marginX * 2) - 10) / 3;
    const boxHeight = 20;

    // Función helper para dibujar caja de métrica
    const drawMetricBox = (x, title, value) => {
        doc.setFillColor(245, 247, 250); // Color de fondo suave
        doc.setDrawColor(200, 200, 200); // Borde gris
        doc.rect(x, finalY, boxWidth, boxHeight, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(title, x + (boxWidth / 2), finalY + 7, { align: 'center' });
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.font = "helvetica";
        doc.setFont(undefined, 'bold');
        doc.text(value, x + (boxWidth / 2), finalY + 15, { align: 'center' });
        doc.setFont(undefined, 'normal');
    };

    drawMetricBox(marginX, 'TOTAL TARJETA', totalTarjeta);
    drawMetricBox(marginX + boxWidth + 5, 'PEDIDOS YA', totalPedidosYa);
    drawMetricBox(marginX + (boxWidth + 5) * 2, 'VENTAS CRÉDITO', totalCredito);

    finalY += boxHeight + 15;

    // --- CONFIGURACIÓN COMÚN DE TABLAS ---
    const tableStyles = {
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' }, // Azul corporativo
        bodyStyles: { textColor: 50 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        theme: 'grid'
    };

    // --- SECCIÓN 2: RECAUDACIÓN ---
    doc.setFontSize(14);
    doc.text('Recaudación', marginX, finalY);
    finalY += 6;

    // Preparar datos de Recaudación
    const dataRecaudacion = [];
    const tbodyRecaudacion = document.getElementById('tbodyRecaudacion');
    if (tbodyRecaudacion) {
        tbodyRecaudacion.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 6) {
                dataRecaudacion.push([
                    cells[0].textContent.trim().replace(/\n/g, ' - '), // Cajero y Caja en una línea
                    cells[1].textContent.trim(),
                    cells[2].querySelector('input')?.value || cells[2].textContent.trim(), // Valor del input
                    cells[3].textContent.trim(),
                    cells[4].textContent.trim(),
                    cells[5].textContent.trim()
                ]);
            }
        });
    }

    // Agregar fila de totales
    const rowTotalRec = document.getElementById('rowTotalRecaudacion');
    if (rowTotalRec) {
        const cells = rowTotalRec.querySelectorAll('td');
        if (cells.length >= 6) {
            dataRecaudacion.push([
                'TOTALES',
                cells[1].textContent.trim(),
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                cells[4].textContent.trim(),
                cells[5].textContent.trim()
            ]);
        }
    }

    if (dataRecaudacion.length > 0) {
        doc.autoTable({
            startY: finalY,
            head: [['CAJERO/CAJA', 'ING. TIENDA', 'EFECTIVO', 'SOBRANTE', 'FALTANTE', 'SUBTOTAL']],
            body: dataRecaudacion,
            ...tableStyles,
            columnStyles: {
                0: { cellWidth: 45 },
                1: { halign: 'right' },
                2: { halign: 'right', fontStyle: 'bold' },
                3: { halign: 'right' },
                4: { halign: 'right', textColor: [200, 0, 0] }, // Rojo para faltante
                5: { halign: 'right', fontStyle: 'bold' }
            },
            didParseCell: function (data) {
                // Estilo para la fila de totales
                if (data.row.index === dataRecaudacion.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [230, 230, 230];
                }
            }
        });
        finalY = doc.lastAutoTable.finalY + 15;
    } else {
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text('(No hay registros de recaudación)', marginX, finalY + 5);
        finalY += 15;
        doc.setTextColor(0);
    }

    // --- SECCIÓN 3: PAGOS / EGRESOS ---
    // Verificar espacio en página
    if (finalY > pageHeight - 40) { doc.addPage(); finalY = 20; }

    doc.setFontSize(14);
    doc.text('Pagos / Egresos', marginX, finalY);
    finalY += 6;

    const dataEgresos = [];
    const tbodyEgresos = document.getElementById('tbodyPagosEgresos');
    if (tbodyEgresos) {
        tbodyEgresos.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                dataEgresos.push([
                    cells[0].textContent.trim(),
                    cells[1].textContent.trim(),
                    cells[2].textContent.trim(),
                    cells[3].textContent.trim()
                ]);
            }
        });
    }

    // Total Egresos
    const tfootEgresos = document.getElementById('tfootPagosEgresos');
    if (tfootEgresos) {
        const totalRow = tfootEgresos.querySelector('tr');
        if (totalRow) {
            const cells = totalRow.querySelectorAll('td');
            // Manejar caso con colspan (3 columnas unificadas + 1 valor) --> Total 2 celdas
            if (cells.length >= 2) {
                // El valor siempre es la última celda
                const totalValue = cells[cells.length - 1].textContent.trim();
                dataEgresos.push(['', '', 'TOTAL:', totalValue]);
            }
        }
    }

    if (dataEgresos.length > 0) {
        doc.autoTable({
            startY: finalY,
            head: [['CAJERO', 'CATEGORÍA', 'DESCRIPCIÓN', 'MONTO']],
            body: dataEgresos,
            ...tableStyles,
            columnStyles: {
                3: { halign: 'right' }
            },
            didParseCell: function (data) {
                if (data.row.index === dataEgresos.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
        finalY = doc.lastAutoTable.finalY + 15;
    } else {
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text('(No hay registros de egresos)', marginX, finalY + 5);
        finalY += 15;
        doc.setTextColor(0);
    }

    // --- SECCIÓN 4: INGRESOS / EGRESOS (RESUMEN FINAL) ---
    // Verificar espacio
    if (finalY > pageHeight - 40) { doc.addPage(); finalY = 20; }

    doc.setFontSize(14);
    doc.text('Balance Final', marginX, finalY);
    finalY += 6;

    const dataBalance = [];
    const tbodyIngresosEgresos = document.getElementById('tbodyIngresosEgresos');
    if (tbodyIngresosEgresos) {
        tbodyIngresosEgresos.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                // Parsear estructura compleja de celdas (div > spans)
                const getCellData = (cell) => {
                    const div = cell.querySelector('div');
                    if (div) {
                        const spans = div.querySelectorAll('span');
                        if (spans.length >= 2) {
                            return { label: spans[0].textContent.trim(), amount: spans[1].textContent.trim() };
                        }
                    }
                    return { label: '', amount: '' };
                };

                const ing = getCellData(cells[0]);
                const egr = getCellData(cells[1]);

                dataBalance.push([ing.label, ing.amount, egr.label, egr.amount]);
            }
        });
    }

    if (dataBalance.length > 0) {
        doc.autoTable({
            startY: finalY,
            head: [['CONCEPTOS INGRESOS', 'MONTO', 'CONCEPTOS EGRESOS', 'MONTO']],
            body: dataBalance,
            ...tableStyles,
            headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' }, // Gris oscuro para diferenciar
            columnStyles: {
                1: { halign: 'right', textColor: [0, 100, 0] }, // Verde para ingresos
                3: { halign: 'right', textColor: [200, 0, 0] }  // Rojo para egresos
            }
        });
        finalY = doc.lastAutoTable.finalY + 10;
    }

    // --- SECCIÓN 5: SALDO CAJA DIA ANTERIOR Y TOTAL GENERAL ---
    // Buscar en la tabla de balance las filas especiales
    let saldoAnterior = '';
    let totalGeneral = '';

    if (tbodyIngresosEgresos) {
        tbodyIngresosEgresos.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const getCellData = (cell) => {
                    const div = cell.querySelector('div');
                    if (div) {
                        const spans = div.querySelectorAll('span');
                        if (spans.length >= 2) {
                            const label = spans[0].textContent.trim();
                            const amount = spans[1].textContent.trim();
                            return { label, amount };
                        }
                    }
                    return null;
                };

                const ing = getCellData(cells[0]);
                const egr = getCellData(cells[1]);

                // Buscar "SALDO CAJA DIA ANTERIOR"
                if (ing && ing.label && ing.label.toUpperCase().includes('SALDO') && ing.label.toUpperCase().includes('ANTERIOR')) {
                    saldoAnterior = ing.amount;
                }
                if (egr && egr.label && egr.label.toUpperCase().includes('SALDO') && egr.label.toUpperCase().includes('ANTERIOR')) {
                    saldoAnterior = egr.amount;
                }

                // Buscar "Total Gral" o "TOTAL GENERAL"
                if (ing && ing.label && (ing.label.toUpperCase().includes('TOTAL') && (ing.label.toUpperCase().includes('GRAL') || ing.label.toUpperCase().includes('GENERAL')))) {
                    totalGeneral = ing.amount;
                }
                if (egr && egr.label && (egr.label.toUpperCase().includes('TOTAL') && (egr.label.toUpperCase().includes('GRAL') || egr.label.toUpperCase().includes('GENERAL')))) {
                    totalGeneral = egr.amount;
                }
            }
        });
    }

    // Si encontramos los valores, mostrarlos en una sección destacada
    if (saldoAnterior || totalGeneral) {
        // Verificar espacio
        if (finalY > pageHeight - 50) { doc.addPage(); finalY = 20; }

        finalY += 5;

        // Dibujar caja de resumen final
        const summaryBoxHeight = 30;
        const summaryBoxY = finalY;

        // Fondo de la caja
        doc.setFillColor(240, 248, 255); // Azul muy claro
        doc.setDrawColor(41, 128, 185); // Azul corporativo
        doc.setLineWidth(1);
        doc.rect(marginX, summaryBoxY, pageWidth - (marginX * 2), summaryBoxHeight, 'FD');

        finalY += 8;

        // Saldo Anterior
        if (saldoAnterior) {
            doc.setFontSize(11);
            doc.setTextColor(0);
            doc.text('SALDO CAJA DÍA ANTERIOR:', marginX + 5, finalY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 100, 0); // Verde
            doc.text(saldoAnterior, pageWidth - marginX - 5, finalY, { align: 'right' });
            doc.setFont(undefined, 'normal');
            finalY += 8;
        }

        // Total General
        if (totalGeneral) {
            doc.setFontSize(13);
            doc.setTextColor(0);
            doc.setFont(undefined, 'bold');
            doc.text('TOTAL GENERAL:', marginX + 5, finalY);
            doc.setTextColor(0, 0, 139); // Azul oscuro
            doc.text(totalGeneral, pageWidth - marginX - 5, finalY, { align: 'right' });
            doc.setFont(undefined, 'normal');
            finalY += 8;
        }

        finalY += 5;
    }

    // --- PIE DE PÁGINA (Números de página) ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Guardar PDF
    const fechaArchivo = new Date().toISOString().split('T')[0];
    doc.save(`Resumen_Tesoreria_${fechaArchivo}.pdf`);

    mostrarNotificacion('PDF generado correctamente', 'success');
};
