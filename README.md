# BenMarket - Sistema de Tesorería

Sistema de gestión de tesorería para BenMarket, con control de ingresos, egresos, arqueo de caja y reportes.

## Estructura del Proyecto

```
benMark/
├── index.html              # Página principal de la aplicación
├── server.js               # Servidor local (opcional)
├── src/                    # Código fuente
│   ├── js/                 # Archivos JavaScript
│   │   ├── app.js          # Lógica principal de la aplicación
│   │   ├── login.js        # Lógica de autenticación
│   │   └── supabase.js     # Configuración de Supabase (futuro)
│   ├── css/                # Hojas de estilo
│   │   ├── styles.css      # Estilos principales
│   │   └── login.css       # Estilos del login
│   └── pages/              # Páginas HTML adicionales
│       └── login.html      # Página de inicio de sesión
└── docs/                   # Documentación
    ├── README.md           # Documentación del proyecto
    └── INSTRUCCIONES.md    # Instrucciones de uso

```

## Inicio Rápido

1. **Abrir la aplicación**: Abre `src/pages/login.html` en tu navegador
2. **Iniciar sesión**: 
   - Usuario: `jpiris` / Contraseña: `123` / Rol: `cajero`
   - Usuario: `admin` / Contraseña: `admin` / Rol: `admin`
3. **Usar la aplicación**: Navega por las diferentes secciones usando el menú superior

## Funcionalidades

- **Ingresos**: Registro de ingresos de caja con desglose de efectivo
- **Egresos**: Registro de egresos de caja con desglose de billetes
- **Operaciones**: Gestión de gastos y operaciones
- **Arqueo de Caja**: Resumen y cierre de caja con exportación a PDF
- **Resumen**: Vista general de la tesorería del día

## Tecnologías

- HTML5
- CSS3
- JavaScript (Vanilla)
- jsPDF (para exportación de PDFs)
- XLSX (para exportación de Excel)

## Notas

- Los datos se almacenan en `localStorage` del navegador
- Para producción, se recomienda implementar un backend con Supabase o similar
