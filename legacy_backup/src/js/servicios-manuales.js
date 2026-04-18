// ============================================
// FUNCIONES PARA SERVICIOS MANUALES
// ============================================

// Variable global para almacenar servicios manuales
if (typeof window.serviciosManuales === 'undefined') {
    window.serviciosManuales = [];
}

/**
 * Toggle del formulario de servicio manual
 */
function toggleFormularioServicioManual() {
    const formulario = document.getElementById('formularioServicioManual');
    const btn = document.getElementById('btnToggleServicioManual');

    if (formulario.style.display === 'none') {
        formulario.style.display = 'block';
        btn.textContent = '➖ Ocultar Formulario';
        // Focus en el primer input
        document.getElementById('nombreServicioManual')?.focus();
    } else {
        formulario.style.display = 'none';
        btn.textContent = '➕ Agregar Servicio Manual';
        limpiarFormularioServicioManual();
    }
}

/**
 * Agregar servicio manual
 */
function agregarServicioManual() {
    const nombreInput = document.getElementById('nombreServicioManual');
    const montoInput = document.getElementById('montoServicioManual');
    const loteInput = document.getElementById('loteServicioManual');

    const nombre = nombreInput.value.trim();
    const montoTexto = montoInput.value.trim().replace(/\D/g, '');
    const lote = loteInput.value.trim();

    // Validaciones
    if (!nombre) {
        showNotification('Por favor ingrese el nombre del servicio', 'warning');
        nombreInput.focus();
        return;
    }

    if (!montoTexto || parseInt(montoTexto) === 0) {
        showNotification('Por favor ingrese un monto válido', 'warning');
        montoInput.focus();
        return;
    }

    const monto = parseInt(montoTexto);

    // Agregar al array de servicios manuales
    window.serviciosManuales.push({
        id: generarIdUnico(),
        nombre: nombre,
        monto: monto,
        lote: lote || null,
        fecha_agregado: new Date().toISOString()
    });

    // Guardar en localStorage
    localStorage.setItem('serviciosManuales', JSON.stringify(window.serviciosManuales));

    // Limpiar formulario y ocultar
    limpiarFormularioServicioManual();
    toggleFormularioServicioManual();

    // Re-renderizar panel de montos
    renderizarServiciosManuales();

    showNotification(`✅ Servicio "${nombre}" agregado: ${formatearMoneda(monto, 'gs')}`, 'success');
}

/**
 * Cancelar servicio manual
 */
function cancelarServicioManual() {
    limpiarFormularioServicioManual();
    toggleFormularioServicioManual();
}

/**
 * Limpiar formulario
 */
function limpiarFormularioServicioManual() {
    document.getElementById('nombreServicioManual').value = '';
    document.getElementById('montoServicioManual').value = '';
    document.getElementById('loteServicioManual').value = '';
}

/**
 * Renderizar servicios manuales en el panel
 */
function renderizarServiciosManuales() {
    const listaMontos = document.getElementById('listaMontosServicios');
    if (!listaMontos) return;

    // Limpiar solo los elementos manuales
    const elementosManuales = listaMontos.querySelectorAll('[data-manual="true"]');
    elementosManuales.forEach(el => el.remove());

    // Agregar servicios manuales
    if (window.serviciosManuales && window.serviciosManuales.length > 0) {
        // Mostrar el panel si estaba oculto
        const controlContainer = document.getElementById('controlMontosDepositar');
        if (controlContainer) {
            controlContainer.style.display = 'block';
        }

        window.serviciosManuales.forEach(servicioManual => {
            const row = document.createElement('div');
            row.setAttribute('data-manual', 'true');
            row.setAttribute('data-id', servicioManual.id);
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '8px';
            row.style.borderRadius = '4px';
            row.style.background = '#fff3cd'; // Fondo amarillo claro para distinguir
            row.style.border = '1px dashed #ffc107';
            row.style.marginBottom = '0.5rem';

            row.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #333; font-size: 0.95rem;">
                        ${servicioManual.nombre}
                        <span style="background: #856404; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.75rem; margin-left: 8px;">MANUAL</span>
                    </div>
                    ${servicioManual.lote ? `<div style="font-size: 0.8rem; color: #666;">Lote: ${servicioManual.lote}</div>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: bold; color: #333;">${formatearMoneda(servicioManual.monto, 'gs')}</span>
                    <button 
                        onclick="eliminarServicioManual('${servicioManual.id}')" 
                        style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;"
                        title="Eliminar servicio">
                        🗑️
                    </button>
                </div>
            `;

            listaMontos.appendChild(row);
        });
    }
}

/**
 * Eliminar servicio manual
 */
function eliminarServicioManual(id) {
    if (!confirm('¿Eliminar este servicio manual?')) {
        return;
    }

    window.serviciosManuales = window.serviciosManuales.filter(s => s.id !== id);
    localStorage.setItem('serviciosManuales', JSON.stringify(window.serviciosManuales));

    renderizarServiciosManuales();
    showNotification('🗑️ Servicio eliminado', 'info');
}

/**
 * Cargar servicios manuales desde localStorage
 */
function cargarServiciosManualesDesdeStorage() {
    const guardados = localStorage.getItem('serviciosManuales');
    if (guardados) {
        try {
            window.serviciosManuales = JSON.parse(guardados);
            renderizarServiciosManuales();
        } catch (e) {
            console.error('Error cargando servicios manuales:', e);
            window.serviciosManuales = [];
        }
    }
}

// Cargar servicios manuales al cargar la página de resumen servicios
if (window.location.pathname.includes('resumenServicios')) {
    document.addEventListener('DOMContentLoaded', () => {
        cargarServiciosManualesDesdeStorage();
    });
}
