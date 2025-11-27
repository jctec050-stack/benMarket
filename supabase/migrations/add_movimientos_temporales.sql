CREATE TABLE IF NOT EXISTS movimientos_temporales (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    cajero TEXT,
    caja TEXT NOT NULL,
    descripcion TEXT,
    valor_venta INTEGER DEFAULT 0,
    efectivo JSONB,
    efectivo_vuelto JSONB,
    monedas_extranjeras JSONB,
    pagos_tarjeta INTEGER DEFAULT 0,
    ventas_credito INTEGER DEFAULT 0,
    pedidos_ya INTEGER DEFAULT 0,
    ventas_transferencia INTEGER DEFAULT 0,
    servicios JSONB,
    otros_servicios JSONB,
    historial_ediciones JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movtmp_fecha ON movimientos_temporales(fecha);
CREATE INDEX IF NOT EXISTS idx_movtmp_caja ON movimientos_temporales(caja);
