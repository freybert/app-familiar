-- 1. Añadir columna 'robada' a la tabla de tareas
ALTER TABLE tasks
ADD COLUMN robada boolean DEFAULT false;

-- 2. Añadir columna 'activo' a la tabla de la tienda (shop_items)
ALTER TABLE shop_items
ADD COLUMN activo boolean DEFAULT true;
