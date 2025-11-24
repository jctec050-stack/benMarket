# BenMark - Sistema de Tesorería

## 📁 Archivos del Proyecto

Este proyecto contiene solo los archivos necesarios para funcionar:

### ✅ **Archivos Principales:**
- `index.html` - Página principal de la aplicación
- `styles.css` - Estilos y diseño
- `app.js` - Lógica de JavaScript
- `supabase.js` - Configuración para Supabase (opcional)
- `server.js` - Servidor local (opcional)
- `README.md` - Documentación completa

## 🚀 **Cómo Usar la Aplicación**

### **Opción 1: Abrir Directamente (Más Fácil)**
1. Haz doble clic en `index.html`
2. La aplicación se abrirá en tu navegador predeterminado
3. ¡Listo para usar!

### **Opción 2: Servidor Local (Recomendado para desarrollo)**
1. Abre una terminal en esta carpeta
2. Ejecuta: `node server.js`
3. Abre tu navegador y ve a: `http://localhost:8080`
4. Presiona `Ctrl+C` para detener el servidor

### **Opción 3: Usar una Extensión de VS Code**
1. Instala la extensión "Live Server" en VS Code
2. Haz clic derecho en `index.html`
3. Selecciona "Open with Live Server"

## 📊 **Funcionalidades**

✅ **Arqueo de Caja** - Registro completo de ingresos  
✅ **Resumen de Tesorería** - Vista diaria de movimientos  
✅ **Gastos y Operaciones** - Control de movimientos externos  
✅ **Exportar a Excel** - Descarga de reportes  
✅ **Almacenamiento Local** - Funciona sin internet  
✅ **Diseño Responsive** - Funciona en móvil, tablet y desktop  

## 🔧 **Configuración de Supabase (Opcional)**

Si quieres usar Supabase para almacenamiento en la nube:

1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Copia la URL y Anon Key
4. Actualiza `supabase.js` con tus credenciales
5. Ejecuta las consultas SQL del archivo `supabase.js`

## 💾 **Respaldo de Datos**

Los datos se guardan automáticamente en:
- **LocalStorage** del navegador (funciona inmediatamente)
- **Supabase** (cuando configures tu cuenta)

## 🎯 **Próximos Pasos**

- Configurar Supabase para respaldo en la nube
- Personalizar colores y estilos según tu marca
- Agregar más tipos de servicios si es necesario
- Implementar autenticación de usuarios

## 📞 **Soporte**

Si tienes problemas:
1. Verifica que estés usando un navegador moderno (Chrome, Firefox, Edge)
2. Limpia el caché del navegador
3. Revisa la consola del navegador (F12) para errores
4. Consulta el archivo `README.md` completo

---

**¡La aplicación está lista para usar!** 🎉