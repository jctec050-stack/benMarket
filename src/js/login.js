document.addEventListener('DOMContentLoaded', () => {
    // **MODIFICADO:** Obtener usuarios desde localStorage
    let usuarios = JSON.parse(localStorage.getItem('usuarios'));

    // Si no hay usuarios en localStorage (primera vez que se usa), crear un admin por defecto
    if (!usuarios || usuarios.length === 0) {
        usuarios = [
            { username: 'admin', password: 'admin', rol: 'admin' }
        ];
        // Guardar el usuario admin por defecto para futuros inicios de sesión
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    const rolSelect = document.getElementById('userRole');
    const cajaContainer = document.getElementById('caja-login-container');
    const cajaSelect = document.getElementById('cajaLogin');
    const passwordInput = document.getElementById('password');
    const togglePasswordButton = document.getElementById('togglePassword');

    // --- Lógica para mostrar/ocultar contraseña ---
    togglePasswordButton.addEventListener('click', function () {
        // Cambiar el tipo del input de 'password' a 'text' y viceversa
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Cambiar el ícono del botón para dar feedback visual
        this.textContent = type === 'password' ? '👁️' : '🙈';
    });
    // --- Fin de la lógica ---

    // Función para mostrar u ocultar el selector de caja y ajustar 'required'
    const toggleCajaSelector = () => {
        // **MODIFICADO:** Solo mostrar para el rol 'cajero'
        if (rolSelect.value === 'cajero') {
            cajaContainer.style.display = 'block';
            cajaSelect.required = true;
        } else {
            cajaContainer.style.display = 'none';
            cajaSelect.required = false;
        }
    };

    // 1. Llama a la función al cargar la página para establecer el estado inicial correcto.
    // Esto asegura que si el rol por defecto es 'cajero', la caja sea visible.
    toggleCajaSelector();

    // 2. Añade el listener para que la visibilidad cambie cada vez que el usuario selecciona un rol.
    rolSelect.addEventListener('change', toggleCajaSelector);

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Evita que el formulario se envíe de la forma tradicional

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const rol = rolSelect.value;
        let caja = cajaSelect.value; // Usamos let para poder modificarla

        // Buscar al usuario en nuestra "base de datos"
        const usuarioValido = usuarios.find(
            user => user.username === username && user.password === password && user.rol === rol
        );

        if (rol === 'cajero' && !caja) {
            // La validación de caja ahora solo aplica a 'cajero'
            errorMessage.textContent = 'Por favor, seleccione una caja para continuar.';
            return; // Detenemos la ejecución aquí.
        }

        if (usuarioValido) {
            // Si el usuario es válido, guardamos sus datos en sessionStorage
            // sessionStorage se borra cuando se cierra la pestaña del navegador
            sessionStorage.setItem('usuarioActual', username);
            sessionStorage.setItem('userRole', rol);

            // Guardamos la caja para los roles que la tienen predefinida.
            if (rol === 'cajero' || rol === 'tesoreria') {
                if (rol === 'tesoreria') caja = 'Caja Tesoreria'; // Aseguramos la caja para Tesorería
                sessionStorage.setItem('cajaSeleccionada', caja);
            }

            // Redirigimos al usuario a la página principal de la aplicación
            window.location.href = 'index.html';
        } else {
            // Si el usuario no es válido, mostramos un mensaje de error
            errorMessage.textContent = 'Usuario, contraseña o rol incorrectos.';
        }
    });
});