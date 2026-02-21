-- Eliminar políticas de lectura restrictivas si existen
DROP POLICY IF EXISTS "Permitir leer tareas" ON tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Permitir ver tareas a usuarios autenticados" ON tasks;

-- Crear política de lectura amplia para usuarios autenticados
CREATE POLICY "Permitir ver tareas a usuarios autenticados" 
ON tasks 
FOR SELECT 
TO authenticated 
USING (true);
