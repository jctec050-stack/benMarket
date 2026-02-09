# 🚀 Guía de Despliegue - BenMarket

## 📋 Pre-requisitos

Antes de desplegar a producción, asegúrate de:

- [ ] Tener acceso al dashboard de Supabase
- [ ] Tener cuenta en Vercel (o plataforma de hosting elegida)
- [ ] Backup de la base de datos de desarrollo
- [ ] Credenciales de Supabase de producción listas

---

## 🔐 Variables de Entorno

### 1. Configuración en Vercel

1. Ve a tu proyecto en Vercel → Settings → Environment Variables
2. Agrega las siguientes variables:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui
NODE_ENV=production
```

3. Aplica a: **Production, Preview, Development**

### 2. Obtener Credenciales de Supabase

1. Ve a https://app.supabase.com/project/TU_PROYECTO/settings/api
2. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public** key → `SUPABASE_ANON_KEY`

> [!WARNING]
> Nunca compartas la `service_role` key en el frontend. Solo usa `anon` key.

---

## 🗄️ Configuración de Base de Datos

### 1. Ejecutar Migraciones en Supabase

Ve al **SQL Editor** de Supabase y ejecuta en orden:

#### Paso 1: Migraciones Base (si es nuevo proyecto)
```sql
-- 1. init_benmark.sql (estructura básica)
-- 2. setup_auth.sql (autenticación y RLS)
-- 3. add_movimientos_temporales.sql
-- 4. add_arqueos.sql
-- 5. add_recaudacion.sql
```

#### Paso 2: Políticas DELETE (NUEVO)
```sql
-- Ejecutar: add_delete_policies.sql
```

### 2. Verificar Políticas

Ejecuta esta consulta para verificar:
```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

Deberías ver políticas para: SELECT, INSERT, UPDATE, **DELETE** en todas las tablas.

### 3. Crear Usuario Admin Inicial

En Supabase → Authentication → Users:

1. Click "Add user" → "Create new user"
2. Email: `admin@benmarket.com`
3. Password: (genera una segura)
4. Auto Confirm User: ✅

Luego en SQL Editor:
```sql
UPDATE perfiles_usuarios 
SET rol = 'admin' 
WHERE username = 'admin@benmarket.com';
```

---

## 📦 Deployment a Vercel

### Opción 1: Desde Git (Recomendado)

1. **Push código a GitHub:**
   ```bash
   git add .
   git commit -m "Preparado para producción"
   git push origin main
   ```

2. **Conectar a Vercel:**
   - Ve a https://vercel.com/new
   - Selecciona el repositorio de GitHub
   - Configure project:
     - Framework Preset: **Other**
     - Root Directory: `./`
     - Build Command: (dejar vacío)
     - Output Directory: `.`

3. **Agregar variables de entorno** (ver sección anterior)

4. **Deploy**

### Opción 2: Desde CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## ✅ Checklist Post-Deployment

### Inmediatamente después del deploy:

- [ ] Verificar que la app carga: https://tu-proyecto.vercel.app
- [ ] Probar login con usuario de prueba
- [ ] Verificar conexión a Supabase (abrir Network en DevTools)
- [ ] Probar registro de un ingreso simple
- [ ] Probar eliminación de un registro
- [ ] Verificar que NO hay console.log en producción (abrir Console en DevTools)

### En las primeras 24 horas:

- [ ] Monitorear errores en Vercel Analytics
- [ ] Revisar logs de Supabase
- [ ] Probar flujo completo de arqueo de caja
- [ ] Probar modo offline (desconectar WiFi y hacer operaciones)
- [ ] Verificar sincronización cuando vuelve la conexión

### Primera semana:

- [ ] Recibir feedback de usuarios
- [ ] Revisar performance (tiempo de carga)
- [ ] Verificar backup automático de base de datos
- [ ] Documentar cualquier issue reportado

---

## 🐛 Troubleshooting

### Problema: "Supabase no disponible"

**Solución:**
1. Verificar variables de entorno en Vercel
2. Verificar que las URLs no tengan espacios o saltos de línea
3. Revisar en DevTools → Console si hay errores de CORS

### Problema: "No puede eliminar registros"

**Solución:**
1. Verificar que ejecutaste `add_delete_policies.sql`
2. Verificar que el usuario está autenticado
3. En Supabase SQL Editor:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'egresos_caja' AND cmd = 'DELETE';
   ```

### Problema: "Usuario no puede iniciar sesión"

**Solución:**
1. Verificar que el usuario existe en Supabase Auth
2. Verificar que tiene entrada en `perfiles_usuarios`:
   ```sql
   SELECT * FROM perfiles_usuarios WHERE username = 'email@ejemplo.com';
   ```
3. Verificar que `activo = true`

---

## 🔄 Plan de Rollback

Si algo sale mal en producción:

### Rollback Inmediato en Vercel:

1. Ve a tu proyecto en Vercel
2. Pestaña **Deployments**
3. Encuentra el deployment anterior estable
4. Click en "..." → **Promote to Production**

### Rollback de Base de Datos:

```sql
-- Revertir políticas DELETE (si causan problemas)
DROP POLICY IF EXISTS "egresos_delete" ON public.egresos_caja;
DROP POLICY IF EXISTS "movimientos_delete" ON public.movimientos;
DROP POLICY IF EXISTS "arqueos_delete" ON public.arqueos;
DROP POLICY IF EXISTS "movimientos_temporales_delete" ON public.movimientos_temporales;
```

Luego recrear las políticas SELECT/INSERT/UPDATE originales.

---

## 📱 Testing en Dispositivos Móviles

1. Obtén la URL de Vercel
2. Abre en:
   - Chrome (Android)
   - Safari (iOS)
   - Navegador integrado de WhatsApp
3. Prueba:
   - Login
   - Registro de venta
   - Menú hamburguesa
   - Exportar PDF

---

## 🔒 Seguridad Post-Deployment

### Revisar Logs de Acceso

En Supabase → Logs → Postgres Logs:
- Buscar intentos de acceso no autorizados
- Verificar queries sospechosas

### Revisar Políticas RLS

Ejecutar mensualmente:
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Actualizar Dependencias

Verificar actualizaciones de seguridad:
```bash
npm outdated
npm audit
```

---

## 📞 Contactos de Soporte

- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **GitHub Issues:** (agregar link a tu repo)

---

## 📝 Notas Finales

- **URL de Producción:** (agregar después del deploy)
- **URL de Staging:** (si aplica)
- **Fecha de Deploy:** 
- **Versión:** 1.0.0

**Próxima revisión:** (agendar review post-lanzamiento)
