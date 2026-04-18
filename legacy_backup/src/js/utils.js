// Funciones de utilidad generales y formateo

/**
 * Formatea un número como moneda
 * @param {number|string} monto - El valor a formatear
 * @param {string} moneda - El código de la moneda (gs, usd, brl, ars)
 * @returns {string} El valor formateado
 */
function formatearMoneda(monto, moneda = 'gs') {
    // Asegurar que monto es un número válido
    const montoNumerico = typeof monto === 'number' ? monto : (parseFloat(monto) || 0);
    if (isNaN(montoNumerico)) {
        return new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: moneda === 'gs' ? 'PYG' : moneda === 'usd' ? 'USD' : moneda === 'brl' ? 'BRL' : 'ARS',
            minimumFractionDigits: 0
        }).format(0);
    }
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: moneda === 'gs' ? 'PYG' : moneda === 'usd' ? 'USD' : moneda === 'brl' ? 'BRL' : 'ARS',
        minimumFractionDigits: 0
    }).format(montoNumerico);
}

/**
 * Parsea un string de moneda a número
 * @param {string|number} valor - El valor a parsear
 * @returns {number} El valor numérico
 */
function parsearMoneda(valor) {
    if (typeof valor === 'number') return valor;
    // Elimina puntos de miles y cualquier otro caracter no numérico EXCEPTO el signo menos
    const negativo = String(valor).includes('-');
    const numero = parseInt(String(valor).replace(/\D/g, ''), 10) || 0;
    return negativo ? -numero : numero;
}

/**
 * Muestra/Oculta una sección desplegable
 * @param {string} seccionId - El ID del elemento a alternar
 */
window.toggleSeccion = function (seccionId) {
    const contenido = document.getElementById(seccionId);
    const iconoId = seccionId.replace('contenido', 'icono');
    const icono = document.getElementById(iconoId);

    if (contenido && icono) {
        const estaVisible = contenido.style.display !== 'none';
        contenido.style.display = estaVisible ? 'none' : 'block';
        icono.textContent = estaVisible ? '▶' : '▼';
    }
};
