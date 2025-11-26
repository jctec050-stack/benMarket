document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    const rolSelect = document.getElementById('userRole');
    const cajaContainer = document.getElementById('caja-login-container');
    const cajaSelect = document.getElementById('cajaLogin');
    const passwordInput = document.getElementById('password');
    const togglePasswordButton = document.getElementById('togglePassword');

    // Usuarios (Mock o LocalStorage)
    let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    // Asegurar usuarios por defecto si no existen
    if (!usuarios.some(u => u.username === 'admin')) {
        usuarios.push({ username: 'admin', password: 'admin', rol: 'admin' });
        usuarios.push({ username: 'cajero', password: '123', rol: 'cajero' });
        usuarios.push({ username: 'tesoreria', password: '123', rol: 'tesoreria' });
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
    }

    // --- Lógica para mostrar/ocultar contraseña ---
    if (togglePasswordButton && passwordInput) {
        togglePasswordButton.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // Función para mostrar u ocultar el selector de caja
    const toggleCajaSelector = () => {
        if (rolSelect && cajaContainer && cajaSelect) {
            if (rolSelect.value === 'cajero') {
                cajaContainer.style.display = 'block';
                cajaSelect.required = true;
            } else {
                cajaContainer.style.display = 'none';
                cajaSelect.required = false;
            }
        }
    };

    if (rolSelect) {
        toggleCajaSelector();
        rolSelect.addEventListener('change', toggleCajaSelector);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const rol = rolSelect.value;
            let caja = cajaSelect.value;

            const usuarioValido = usuarios.find(
                user => user.username === username && user.password === password && user.rol === rol
            );

            if (rol === 'cajero' && !caja) {
                errorMessage.textContent = 'Por favor, seleccione una caja para continuar.';
                return;
            }

            if (usuarioValido) {
                sessionStorage.setItem('usuarioActual', username);
                sessionStorage.setItem('userRole', rol);

                if (rol === 'cajero' || rol === 'tesoreria') {
                    if (rol === 'tesoreria') caja = 'Caja Tesoreria';
                    sessionStorage.setItem('cajaSeleccionada', caja);
                }

                window.location.href = 'index.html';
            } else {
                errorMessage.textContent = 'Usuario, contraseña o rol incorrectos.';
            }
        });
    }
}); 
