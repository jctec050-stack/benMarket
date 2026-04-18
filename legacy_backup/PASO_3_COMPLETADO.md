# ✅ Paso 3 Completado: Código Actualizado

He actualizado tu código para usar la nueva autenticación. Aquí está el resumen de los cambios:

## 📝 Cambios Realizados

### 1. **login.js** ✓
- Ahora usa el método `db.iniciarSesion()` con email y contraseña
- Valida que el usuario esté activo
- Obtiene el perfil del usuario y su rol
- Guarda la información en `sessionStorage`
- Se removió el selector manual de rol (ahora viene de Supabase)

### 2. **app.js** ✓
- Agregado verificación de sesión al cargar la página
- Si no hay sesión activa, redirige automáticamente a login
- Obtiene y almacena el perfil del usuario en `usuarioPerfil`

### 3. **login.html** ✓
- Campo de "Usuario" cambió a "Email"
- Se removió el selector de rol (ahora se gestiona en Supabase)
- El selector de caja se mantiene visible para cajeros y tesorería

## 🔑 Próximos Pasos IMPORTANTES

### PASO 1: Ejecutar la Migración SQL en Supabase

1. Abre tu dashboard de Supabase
2. Ve a **SQL Editor**
3. Copia el contenido de este archivo:
   ```
   c:\Users\jpiris\Desktop\benMark\supabase\migrations\setup_auth.sql
   ```
4. Crea una nueva query y pega el contenido
5. **Ejecuta la query**

**Esto creará:**
- La tabla `perfiles_usuarios` vinculada a `auth.users`
- Políticas de Row Level Security
- Triggers automáticos

### PASO 2: Crear Usuarios de Prueba en Supabase

En tu dashboard de Supabase, ve a **Authentication > Users** y crea 3 usuarios:

**Usuario 1 (Admin)**
- Email: `admin@benmarket.com`
- Password: `Admin123!`
- Confirmado: ✓

**Usuario 2 (Cajero)**
- Email: `cajero@benmarket.com`
- Password: `Cajero123!`
- Confirmado: ✓

**Usuario 3 (Tesorería)**
- Email: `tesoreria@benmarket.com`
- Password: `Tesoreria123!`
- Confirmado: ✓

### PASO 3: Asignar Roles a los Usuarios

Una vez creados los usuarios en Supabase, necesitas asignar sus roles. Los perfiles se crearán automáticamente gracias al trigger, pero con rol "cajero" por defecto.

Para cambiar el rol a admin o tesoreria, ejecuta esto en el SQL Editor de Supabase:

```sql
-- Cambiar admin a rol 'admin'
UPDATE perfiles_usuarios SET rol = 'admin' 
WHERE username = 'admin@benmarket.com';

-- Cambiar tesorería a rol 'tesoreria'
UPDATE perfiles_usuarios SET rol = 'tesoreria' 
WHERE username = 'tesoreria@benmarket.com';
```

## 🧪 Cómo Probar

1. Asegúrate de que Supabase esté correctamente configurado
2. Abre `login.html` en tu navegador
3. Intenta iniciar sesión con:
   - Email: `cajero@benmarket.com`
   - Contraseña: `Cajero123!`
   - Caja: Elige cualquiera

Si todo está bien, deberías ser redirigido a la página principal (`index.html`).

## ⚠️ Importante

- **No uses localStorage para contraseñas** - Supabase las maneja de forma segura
- **Los tokens JWT se renuevan automáticamente** - Supabase lo hace por ti
- **Usa HTTPS en producción** - Obligatorio para la seguridad
- **Los roles se validan en el servidor** - Las políticas de RLS protegen los datos

## 🆘 Si algo no funciona

1. Revisa la consola del navegador (F12 > Console)
2. Verifica que Supabase esté inicializado correctamente
3. Comprueba que la migración SQL se ejecutó sin errores
4. Asegúrate de que los usuarios fueron creados en Supabase

¿Necesitas ayuda con cualquier paso?
