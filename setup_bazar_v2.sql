-- Bazar Expand v2: New Categories and Inventory Logic
-- Run this in the Supabase SQL Editor

-- 1. Schema Updates
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS hidden_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS double_points_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS active_vfx TEXT[] DEFAULT '{}';

-- 2. Seed New Items
INSERT INTO shop_items (name, description, cost, icon, category, metadata) VALUES
('Niebla Misteriosa', 'Oculta tu puntaje en el ranking por 24 horas.', 150, '🌫️', 'travesura', '{"type": "hide_score", "duration": 24}'),
('Intercambio de Tarea', 'Cambia una tarea tuya por la de otro miembro (sujeto a aprobación).', 200, '🔄', 'travesura', '{"type": "task_swap"}'),
('Aura de Estrellas', 'Añade partículas brillantes a la animación 3D de la mascota.', 350, '✨', 'vfx', '{"type": "vfx", "value": "aura_stars"}'),
('Rastro de Fuego', 'Deja una estela de fuego cuando el animalito salta.', 400, '🔥', 'vfx', '{"type": "vfx", "value": "fire_trail"}'),
('Permiso de Siesta', 'Vale por 1 hora extra de descanso sin que nadie te moleste.', 200, '😴', 'voucher', '{"type": "voucher", "value": "siesta"}'),
('Elegir Música del Carro', 'Control total de la radio por un viaje completo.', 100, '🎵', 'voucher', '{"type": "voucher", "value": "music"}'),
('Cena de Campeón', 'Tú eliges qué se pide para cenar el fin de semana.', 600, '🍔', 'voucher', '{"type": "voucher", "value": "dinner"}')
ON CONFLICT (name) DO UPDATE SET 
  cost = EXCLUDED.cost, 
  description = EXCLUDED.description, 
  icon = EXCLUDED.icon, 
  category = EXCLUDED.category, 
  metadata = EXCLUDED.metadata;
