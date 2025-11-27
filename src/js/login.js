document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Supabase
    inicializarSupabase();
    
    // Referencias a elementos del DOM
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    const cajaContainer = document.getElementById('caja-login-container');
    const cajaSelect = document.getElementById('cajaLogin');
    const passwordInput = document.getElementById('password');
    const togglePasswordButton = document.getElementById('togglePassword');

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
        if (cajaContainer && cajaSelect) {
            // El selector de rol ya no existe, los roles se cargan desde Supabase
            cajaContainer.style.display = 'block';
            cajaSelect.required = true;
        }
    };

    toggleCajaSelector();

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            let caja = cajaSelect.value;

            if (!caja) {
                errorMessage.textContent = 'Por favor, seleccione una caja para continuar.';
                return;
            }

            try {
                // Usar el nuevo sistema de autenticación
                const resultado = await db.iniciarSesion(email, password);

                if (!resultado.success) {
                    errorMessage.textContent = 'Email o contraseña incorrectos.';
                    console.error('Error de login:', resultado.error);
                    return;
                }

                // Obtener perfil del usuario
                const perfilResult = await db.obtenerPerfilActual();
                if (!perfilResult.success) {
                    errorMessage.textContent = 'Error al obtener información del usuario.';
                    return;
                }

                const perfil = perfilResult.data;

                // Validar que el usuario está activo
                if (!perfil.activo) {
                    await db.cerrarSesion();
                    errorMessage.textContent = 'Este usuario ha sido desactivado.';
                    return;
                }

                // Guardar información de sesión
                sessionStorage.setItem('usuarioActual', perfil.username);
                sessionStorage.setItem('userRole', perfil.rol);
                
                // Guardar caja seleccionada si es cajero
                if (perfil.rol === 'cajero') {
                    sessionStorage.setItem('cajaSeleccionada', caja);
                } else if (perfil.rol === 'tesoreria') {
                    sessionStorage.setItem('cajaSeleccionada', 'Caja Tesoreria');
                }

                // Redirigir a página principal
                window.location.href = 'index.html';
            } catch (error) {
                errorMessage.textContent = 'Error en el servidor. Intente más tarde.';
                console.error('Error de autenticación:', error);
            }
        });
    }
}); 
