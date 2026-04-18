CREATE TABLE IF NOT EXISTS arqueos (
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

CREATE INDEX IF NOT EXISTS idx_arqueos_fecha ON arqueos(fecha);
CREATE INDEX IF NOT EXISTS idx_arqueos_caja ON arqueos(caja);
CREATE INDEX IF NOT EXISTS idx_arqueos_cajero ON arqueos(cajero);

CREATE TABLE IF NOT EXISTS movimientos (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('gasto','egreso','transferencia','operacion')),
    categoria TEXT,
    descripcion TEXT NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    moneda TEXT NOT NULL CHECK (moneda IN ('gs','usd','brl','ars')),
    caja TEXT,
    referencia TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_categoria ON movimientos(categoria);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja ON movimientos(caja);

CREATE TABLE IF NOT EXISTS egresos_caja (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    caja TEXT NOT NULL,
    cajero TEXT,
    categoria TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    monto INTEGER NOT NULL,
    referencia TEXT,
    efectivo JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egresos_caja_fecha ON egresos_caja(fecha);
CREATE INDEX IF NOT EXISTS idx_egresos_caja_caja ON egresos_caja(caja);
CREATE INDEX IF NOT EXISTS idx_egresos_caja_categoria ON egresos_caja(categoria);
