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
    const paginasRestringidas = {
        'cajero': ['operaciones.html', 'resumen.html', 'usuarios.html'],
        'tesoreria': ['usuarios.html'],
        'admin': [] // Admin tiene acceso a todo
    };

    // Verificar si la página actual está restringida para el rol
    const restricciones = paginasRestringidas[userRole] || [];

    if (restricciones.includes(paginaActual)) {
        console.warn(`Acceso denegado: ${userRole} no puede acceder a ${paginaActual}`);
        alert('No tienes permisos para acceder a esta página.');
        window.location.href = 'index.html'; // Redirigir a Ingresos
    }
})();
