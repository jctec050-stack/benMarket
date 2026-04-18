# BenMark - Sistema de Tesorería

Sistema web para gestión de arqueos de caja, resumen de tesorería diaria y control de gastos/operaciones.

## 🚀 Características

- **Arqueo de Caja**: Registro completo de ingresos con conteo de efectivo, pagos con tarjeta, transferencias y servicios
- **Resumen de Tesorería**: Vista diaria de todos los movimientos por caja con totales
- **Gastos y Operaciones**: Registro de movimientos externos que no pasan por caja
- **Exportación a Excel**: Descarga de resúmenes en formato Excel
- **Almacenamiento**: Funciona con localStorage (inmediatamente) o Supabase (cuando configures)

## 📋 Requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet (para exportar a Excel)
- Cuenta de Supabase (opcional, para almacenamiento en la nube)

## 🛠️ Instalación

1. **Descarga o clona** los archivos del proyecto
2. **Abre** el archivo `index.html` en tu navegador
3. **¡Listo!** El sistema funcionará inmediatamente con localStorage

## 📊 Uso

### 1. Arqueo de Caja
- Completa los datos del cajero, caja y fecha
- Ingresa las cotizaciones de monedas extranjeras
- Cuenta el efectivo por denominación
- Registra ingresos no efectivos (tarjeta, transferencias, etc.)
- Guarda el arqueo

### 2. Resumen de Tesorería
- Selecciona una fecha para ver el resumen
- Verás los ingresos por caja, totales del día y movimientos
- Puedes descargar el resumen en Excel

### 3. Gastos y Operaciones
- Registra movimientos que no pasan por caja
- Filtra por fecha y tipo de movimiento
- Mantén un historial completo de todas las operaciones

## 🔧 Configuración de Supabase (Opcional)

Para usar Supabase como backend:

### 1. Crea un proyecto en Supabase
- Ve a [https://supabase.com](https://supabase.com)
- Crea una cuenta y un nuevo proyecto
- Copia la URL y la clave anon (Anon Key)

### 2. Configura las tablas
En el panel SQL de Supabase, ejecuta:

```sql
-- Tabla de Arqueos
CREATE TABLE arqueos (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    cajero TEXT NOT NULL,
    caja TEXT NOT NULL,
    fondo_fijo INTEGER DEFAULT 0,
    cotizaciones JSONB,
    efectivo JSONB,
    dolares JSONB,
    reales JSONB,
    pesos JSONB,
    total_efectivo INTEGER DEFAULT 0,
    pagos_tarjeta INTEGER DEFAULT 0,
    ventas_credito INTEGER DEFAULT 0,
    pedidos_ya INTEGER DEFAULT 0,
    ventas_transferencia INTEGER DEFAULT 0,
    servicios JSONB,
    total_servicios INTEGER DEFAULT 0,
    total_ingresos INTEGER DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Movimientos
CREATE TABLE movimientos (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('gasto', 'egreso', 'transferencia', 'operacion')),
    categoria TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    moneda TEXT NOT NULL CHECK (moneda IN ('gs', 'usd', 'brl', 'ars')),
    caja TEXT,
    referencia TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_arqueos_fecha ON arqueos(fecha);
CREATE INDEX idx_arqueos_caja ON arqueos(caja);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX idx_movimientos_tipo ON movimientos(tipo);
```

### 3. Configura el cliente
Actualiza el archivo `supabase.js` con tus credenciales:

```javascript
const SUPABASE_CONFIG = {
    URL: 'https://tuproyecto.supabase.co',
    ANON_KEY: 'tu-clave-anon-aqui'
};
```

### 4. Activa Supabase en tu HTML
Agrega antes del cierre de `</body>` en `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase.js"></script>
```

## 🔐 Seguridad

- Los datos se almacenan localmente en tu navegador (localStorage)
- Si usas Supabase, asegúrate de configurar las reglas de seguridad apropiadas
- No almacenes información sensible sin encriptar

## 📱 Responsive

El sistema es completamente responsive y funciona en:
- Desktop (pantallas grandes)
- Tablets (pantallas medianas)
- Móviles (pantallas pequeñas)

## 🎯 Próximas Mejoras

- [ ] Sincronización automática con Supabase
- [ ] Reportes mensuales y anuales
- [ ] Gráficos de tendencias
- [ ] Exportación a PDF
- [ ] Multi-idioma
- [ ] Modo oscuro

## 🐛 Reporte de Problemas

Si encuentras algún problema:
1. Verifica que estés usando un navegador moderno
2. Limpia el cache del navegador
3. Revisa la consola del navegador (F12) para errores
4. Reporta el problema con los detalles del error

## 📄 Licencia

Este proyecto es de uso libre para fines comerciales y no comerciales.

## 👥 Autor

Desarrollado para BenMark - Sistema de Tesorería

---

**¿Necesitas ayuda?** Contacta al desarrollador o revisa la documentación de Supabase para la configuración avanzada.