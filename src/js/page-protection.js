// ============================================
// PROTECCIÓN DE PÁGINAS POR ROL
// ============================================
// Este script debe incluirse en las páginas restringidas
// para evitar acceso directo mediante URL

(function () {
    'use strict';

    // Obtener la página actual
    const paginaActual = window.location.pathname.split('/').pop();

    // Obtener el rol del usuario
    const userRole = sessionStorage.getItem('userRole');
    const usuarioActual = sessionStorage.getItem('usuarioActual');

    // Si no hay sesión, redirigir al login
    if (!userRole || !usuarioActual) {
        console.warn('No hay sesión activa, redirigiendo al login...');
        window.location.href = 'login.html';
        return;
    }

    // Definir páginas restringidas por rol
    // Lista de páginas a las que NO se puede acceder
    const paginasRestringidas = {
        'cajero': ['operaciones.html', 'resumen.html', 'resumenServicios.html', 'usuarios.html'],
        'tesoreria': ['usuarios.html'],
        'admin': ['usuarios.html'] // Usuarios restringido para todos por ahora
    };

    // Verificar si la página actual está restringida para el rol
    const restricciones = paginasRestringidas[userRole] || [];

    if (restricciones.includes(paginaActual)) {
        console.warn(`Acceso denegado: ${userRole} no puede acceder a ${paginaActual}`);
        showNotification('No tienes permisos para acceder a esta página', 'error');
        setTimeout(() => window.location.href = 'index.html', 1000); // Redirigir a Ingresos
    }
})();
