# Configuración de Autenticación en Supabase para benMark

## 📋 Guía de Implementación

Esta guía te ayudará a configurar la autenticación segura en tu proyecto Supabase.

---

## 1. Pasos en el Dashboard de Supabase

### 1.1 Ejecutar la Migración de Autenticación

1. Ve a tu proyecto en Supabase
2. Abre **SQL Editor**
3. Crea una nueva query y pega el contenido de `supabase/migrations/setup_auth.sql`
4. Ejecuta la query

Esto creará:
- Tabla `perfiles_usuarios` vinculada a `auth.users`
- Políticas de seguridad (Row Level Security)
- Triggers automáticos para crear perfiles

### 1.2 Configurar Email (Opcional pero Recomendado)

1. Ve a **Authentication > Providers**
2. Asegúrate de que "Email" esté habilitado
3. Configura las plantillas de email en **Email Templates**

### 1.3 Configurar URLs Permitidas

1. Ve a **Authentication > URL Configuration**
2. Agrega tu URL local: `http://localhost:3000`
3. Agrega tu dominio de producción cuando lo tengas

---

## 2. Cambios en tu Código

### 2.1 Actualizar login.js

Tu archivo `login.js` debe usar ahora las funciones de autenticación mejoradas:

```javascript
// Inicializar Supabase
inicializarSupabase();

// Para login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const result = await db.iniciarSesion(email, password);
    
    if (result.success) {
        // Obtener perfil
        const perfil = await db.obtenerPerfilActual();
        if (perfil.success) {
            console.log('Rol del usuario:', perfil.data.rol);
            // Redirigir según rol
            window.location.href = '/pages/resumen.html';
        }
    } else {
        alert('Error: ' + result.error.message);
    }
});

// Para logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    const result = await db.cerrarSesion();
    if (result.success) {
        window.location.href = '/pages/login.html';
    }
});
```

### 2.2 Agregar Protección en app.js

```javascript
// Al iniciar la app, verificar sesión
window.addEventListener('load', async () => {
    inicializarSupabase();
    
    const sesion = await db.obtenerSesionActual();
    
    if (!sesion.success || !sesion.data.session) {
        // No hay sesión, redirigir al login
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Obtener perfil para verificar permisos
    const perfil = await db.obtenerPerfilActual();
    if (perfil.success) {
        // Guardar en window para uso en la app
        window.usuarioPerfil = perfil.data;
        console.log('Usuario:', perfil.data.username, 'Rol:', perfil.data.rol);
    }
});
```

---

## 3. Gestión de Usuarios (Solo para Admin)

### 3.1 Crear Nuevo Usuario

```javascript
// Este debe ejecutarse solo por admin
const resultado = await db.registrarUsuario(
    'nuevo@email.com',
    'PasswordSeguro123!',
    'juan_cajero',
    'cajero'  // o 'admin', 'tesoreria'
);

if (resultado.success) {
    console.log('Usuario creado:', resultado.data);
}
```

### 3.2 Listar Todos los Usuarios

```javascript
const resultado = await db.obtenerTodosUsuarios();

if (resultado.success) {
    resultado.data.forEach(usuario => {
        console.log(`${usuario.username} - ${usuario.rol} - ${usuario.activo ? 'Activo' : 'Inactivo'}`);
    });
}
```

### 3.3 Cambiar Rol de Usuario

```javascript
const resultado = await db.actualizarUsuario(
    usuarioId,  // UUID del usuario
    { rol: 'admin' }
);
```

### 3.4 Desactivar Usuario

```javascript
const resultado = await db.actualizarUsuario(
    usuarioId,
    { activo: false }
);
```

---

## 4. Seguridad Implementada

✅ **Autenticación segura** - Contraseñas hasheadas por Supabase
✅ **Row Level Security (RLS)** - Solo datos que el usuario tiene permiso de ver
✅ **Validación de roles** - Admin puede gestionar usuarios
✅ **Usuarios solo activos** - Acceso restringido a usuarios desactivados
✅ **Sesiones seguras** - Token JWT gestionado por Supabase

---

## 5. Políticas de Seguridad Explicadas

### Perfiles de Usuarios (perfiles_usuarios)
- **SELECT**: Usuario ve su perfil o es admin
- **UPDATE**: Solo admin puede actualizar
- **INSERT**: Solo admin puede crear
- **DELETE**: Solo admin puede eliminar

### Arqueos, Movimientos, Egresos
- **SELECT/INSERT**: Solo usuarios autenticados y activos

---

## 6. Flujo de Login Recomendado

```
Usuario entra en login.html
         ↓
Ingresa email y contraseña
         ↓
Sistema llama: db.iniciarSesion(email, password)
         ↓
Supabase valida credenciales
         ↓
Si es correcto: Obtener perfil (rol, username, etc)
         ↓
Redirigir a página principal (resumen.html)
         ↓
App verifica sesión en cada load
```

---

## 7. Recuperación de Contraseña

```javascript
// Solicitar reset
const resultado = await db.restablecerContraseña('usuario@email.com');

// El usuario recibirá un email con link para cambiar contraseña
// Después puede usar:
const actualizar = await db.actualizarContraseña('NuevaPassword123!');
```

---

## ⚠️ Importante

1. **No almacenes contraseñas en localStorage**
2. **Supabase maneja todos los hashes de contraseñas**
3. **Usa HTTPS en producción siempre**
4. **Los tokens JWT expiran** - Supabase los renueva automáticamente
5. **Mantén actualizado** el archivo `setup_auth.sql` en control de versiones

---

## 🔍 Testing

Para probar:

```bash
# En consola del navegador:
await db.registrarUsuario('test@example.com', 'Test123!', 'testuser', 'cajero');
await db.iniciarSesion('test@example.com', 'Test123!');
await db.obtenerPerfilActual();
await db.cerrarSesion();
```

---

## ✨ Próximos Pasos

1. ✅ Ejecutar la migración SQL
2. ✅ Actualizar login.js y app.js con las funciones mejoradas
3. ✅ Crear usuarios de prueba
4. ✅ Probar flujo completo de login/logout
5. ✅ Implementar vista de gestión de usuarios para admin
