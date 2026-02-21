-- Recrear la política RLS para permitir inserciones a los usuarios autenticados
DROP POLICY IF EXISTS "Permitir crear tareas" ON tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tasks;
DROP POLICY IF EXISTS "Permitir crear tareas a usuarios autenticados" ON tasks;

CREATE POLICY "Permitir crear tareas a usuarios autenticados" 
ON tasks 
FOR INSERT 
TO authenticated 
WITH CHECK (true);
