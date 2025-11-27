-- Migración para recrear la tabla movimientos con todas las columnas necesarias
-- Esto elimina la tabla antigua y crea una nueva con la estructura correcta

-- Primero, renombrar la tabla antigua (como backup)
ALTER TABLE IF EXISTS movimientos RENAME TO movimientos_old;

-- Crear la tabla movimientos con la estructura correcta
CREATE TABLE movimientos (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    cajero TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('gasto','egreso','transferencia','operacion')),
    historialEdiciones JSONB DEFAULT '[]'::jsonb,
    receptor TEXT,
    descripcion TEXT NOT NULL,
    numeroRecibo INTEGER,
    monto INTEGER NOT NULL,
    moneda TEXT NOT NULL CHECK (moneda IN ('gs','usd','brl','ars')),
    caja TEXT,
    referencia TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurar los datos de la tabla antigua si existen
INSERT INTO movimientos (id, fecha, tipo, descripcion, monto, moneda, caja, referencia, creado_en)
SELECT id, fecha, tipo, descripcion, monto::integer, moneda, caja, referencia, creado_en
FROM movimientos_old
ON CONFLICT (id) DO NOTHING;

-- Eliminar la tabla antigua
DROP TABLE IF EXISTS movimientos_old;

-- Crear índices para mejor rendimiento
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX idx_movimientos_caja ON movimientos(caja);
CREATE INDEX idx_movimientos_cajero ON movimientos(cajero);
CREATE INDEX idx_movimientos_numeroRecibo ON movimientos(numeroRecibo);
CREATE INDEX idx_movimientos_receptor ON movimientos(receptor);

-- Crear política RLS para acceso seguro
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: permitir que usuarios autenticados vean los movimientos
CREATE POLICY "Usuarios autenticados pueden ver movimientos" ON movimientos
FOR SELECT
USING (auth.role() = 'authenticated');

-- Política para INSERT: permitir que usuarios autenticados inserten
CREATE POLICY "Usuarios autenticados pueden insertar movimientos" ON movimientos
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE: permitir que usuarios autenticados actualicen
CREATE POLICY "Usuarios autenticados pueden actualizar movimientos" ON movimientos
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Política para DELETE: permitir que usuarios autenticados eliminen
CREATE POLICY "Usuarios autenticados pueden eliminar movimientos" ON movimientos
FOR DELETE
USING (auth.role() = 'authenticated');