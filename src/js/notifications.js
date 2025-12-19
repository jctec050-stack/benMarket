// ============================================
// SISTEMA DE NOTIFICACIONES Y DIÁLOGOS MODERNOS
// ============================================

/**
 * Muestra una notificación moderna
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duración en ms (default: 3000)
 */
window.showNotification = function (message, type = 'info', duration = 3000) {
    // Crear contenedor si no existe
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    // Iconos por tipo
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    // Títulos por tipo
    const titles = {
        success: 'Éxito',
        error: 'Error',
        warning: 'Advertencia',
        info: 'Información'
    };

    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">${icons[type]}</div>
        <div class="notification-content">
            <div class="notification-title">${titles[type]}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(notification);

    // Auto-remover después de la duración
    setTimeout(() => {
        notification.classList.add('hiding');
        setTimeout(() => notification.remove(), 300);
    }, duration);
};

/**
 * Muestra un diálogo de confirmación moderno
 * @param {string} message - Mensaje a mostrar
 * @param {Object} options - Opciones del diálogo
 * @returns {Promise<boolean>} - true si confirma, false si cancela
 */
window.showConfirm = function (message, options = {}) {
    return new Promise((resolve) => {
        const {
            title = '¿Está seguro?',
            confirmText = 'Aceptar',
            cancelText = 'Cancelar',
            type = 'warning', // 'warning', 'danger', 'info'
            confirmButtonType = 'default' // 'default', 'danger'
        } = options;

        // Iconos por tipo
        const icons = {
            warning: '⚠️',
            danger: '🗑️',
            info: 'ℹ️'
        };

        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.innerHTML = `
            <div class="dialog-box">
                <div class="dialog-header">
                    <div class="dialog-icon ${type}">${icons[type]}</div>
                    <div class="dialog-title">${title}</div>
                </div>
                <div class="dialog-body">
                    <div class="dialog-message">${message}</div>
                </div>
                <div class="dialog-footer">
                    <button class="dialog-btn dialog-btn-cancel">${cancelText}</button>
                    <button class="dialog-btn dialog-btn-confirm ${confirmButtonType}">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';

        // Función para cerrar el diálogo
        const closeDialog = (result) => {
            overlay.style.animation = 'fadeOut 0.2s ease-in';
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = '';
                resolve(result);
            }, 200);
        };

        // Event listeners
        const cancelBtn = overlay.querySelector('.dialog-btn-cancel');
        const confirmBtn = overlay.querySelector('.dialog-btn-confirm');

        cancelBtn.addEventListener('click', () => closeDialog(false));
        confirmBtn.addEventListener('click', () => closeDialog(true));

        // Cerrar al hacer click fuera del diálogo
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog(false);
            }
        });

        // Cerrar con ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeDialog(false);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
};

/**
 * Wrapper para reemplazar alert() nativo
 */
window.showAlert = function (message, type = 'info') {
    showNotification(message, type, 4000);
};

// Agregar animación de fadeOut al CSS si no existe
if (!document.querySelector('style[data-notifications]')) {
    const style = document.createElement('style');
    style.setAttribute('data-notifications', 'true');
    style.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}
