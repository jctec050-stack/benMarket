-- Crear tabla para cotizaciones globales
CREATE TABLE IF NOT EXISTS cotizaciones (
    id TEXT PRIMARY KEY,
    usd TEXT NOT NULL DEFAULT '7.000',
    brl TEXT NOT NULL DEFAULT '1.250',
    ars TEXT NOT NULL DEFAULT '0',
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar el registro inicial si no existe
INSERT INTO cotizaciones (id, usd, brl, ars)
VALUES ('actual', '7.000', '1.250', '0')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Permitir lectura para todos" ON cotizaciones FOR SELECT USING (true);
CREATE POLICY "Permitir actualización para todos" ON cotizaciones FOR UPDATE USING (true);
CREATE POLICY "Permitir inserción para todos" ON cotizaciones FOR INSERT WITH CHECK (true);
