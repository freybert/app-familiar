-- 1. Eliminar o desactivar 'Capas'
DELETE FROM shop_items WHERE category = 'cape';

-- 2. Insertar 3 nuevos Sombreros
INSERT INTO shop_items (name, description, cost, icon, category) VALUES
('Gorro de Sheriff', 'Un gorro de estrella de la ley para los más rudos.', 500, '🤠', 'hat'),
('Sombrero de Copa', 'Elegante y misterioso, para ocasiones especiales.', 800, '🎩', 'hat'),
('Gorro de Aviador', 'Con gafas incluidas, listo para volar alto.', 600, '🛩️', 'hat');

-- 3. Insertar 3 nuevas Coronas
INSERT INTO shop_items (name, description, cost, icon, category) VALUES
('Corona de Flores', 'Natural y hermosa, te conecta con el bosque.', 400, '🌸', 'crown'),
('Corona de Hielo', 'Fría como el invierno, pero brilla increíble.', 1000, '❄️', 'crown'),
('Diadema Estelar', 'Una diadema mágica forjada con estrellas fugaces.', 1200, '🌟', 'crown');

-- 4. Asegurar que las gafas estén actualizadas (solo aseguro categoría lenses)
UPDATE shop_items SET category = 'lenses' WHERE name ILIKE '%lentes%' OR name ILIKE '%gafas%';

-- Opcional: Asegurar que las evoluciones y efectos estén preparados si no existen
-- Pero según la petición actualizamos solo catálogo.
