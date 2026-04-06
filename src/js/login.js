document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Supabase solo una vez
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

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            let caja = cajaSelect.value;

            try {
                // Primero, obtener el email asociado al username
                const emailResult = await db.obtenerEmailPorUsername(username);

                if (!emailResult.success) {
                    errorMessage.textContent = 'Usuario no encontrado.';
                    console.error('Error obteniendo email:', emailResult.error);
                    return;
                }

                const email = emailResult.email;

                // Usar el email para autenticar
                const resultado = await db.iniciarSesion(email, password);

                if (!resultado.success) {
                    errorMessage.textContent = 'Usuario o contraseña incorrectos.';
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

                if (caja === 'Tesoreria' && perfil.rol !== 'tesoreria' && perfil.rol !== 'admin') {
                    await db.cerrarSesion();
                    errorMessage.textContent = 'Acceso denegado: Solo Tesorería o Administración pueden acceder a esta caja.';
                    return;
                }

                // Validar caja seleccionada (solo para cajeros)
                if (perfil.rol === 'cajero' && !caja) {
                    errorMessage.textContent = 'Por favor, seleccione una caja para continuar.';
                    return;
                }

                // Guardar información de sesión
                sessionStorage.setItem('usuarioActual', perfil.username);
                sessionStorage.setItem('userRole', perfil.rol);

                // Guardar caja seleccionada según el rol
                if (perfil.rol === 'cajero') {
                    sessionStorage.setItem('cajaSeleccionada', caja);
                } else if (perfil.rol === 'tesoreria') {
                    sessionStorage.setItem('cajaSeleccionada', 'Tesoreria');
                } else if (perfil.rol === 'admin') {
                    // Admin guarda su caja seleccionada para que sus movimientos 
                    // tengan esta caja por defecto, pero mantendrá la vista global.
                    sessionStorage.setItem('cajaSeleccionada', caja);
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
