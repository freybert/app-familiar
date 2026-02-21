-- Mega Inyección del Catálogo (Shop Items)
INSERT INTO shop_items (name, description, cost, icon, category, metadata, activo) VALUES
-- Cosméticos: Lentes
('Lentes Oscuros de Matón', 'Un toque cool para tu mascota', 100, '🕶️', 'lenses', null, true),
('Gafas de Empollón', 'Para mascotas intelectuales', 80, '👓', 'lenses', null, true),
('Lentes 3D', 'Para ver la realidad diferente', 80, '🥽', 'lenses', null, true),

-- Cosméticos: Sombreros
('Sombrero Elegante', 'Elegancia clásica', 200, '🎩', 'hat', null, true),
('Gorra Deportiva', 'Siempre listo', 120, '🧢', 'hat', null, true),
('Casco de Rescate', 'Seguridad ante todo', 150, '⛑️', 'hat', null, true),
('Corona de Rey', 'Siente el poder', 500, '👑', 'crown', null, true),

-- Fondos (Categoría 'background' para ser leída por la UI)
('Fondo Anime de Chicas', 'Cambia el entorno a un estilo anime', 500, 'https://img.freepik.com/free-vector/anime-style-landscape-background_23-2149117361.jpg', 'background', '{"value": "https://img.freepik.com/free-vector/anime-style-landscape-background_23-2149117361.jpg", "type": "image"}', true),
('Fondo Normal', 'El entorno clásico de la casa', 100, '🏠', 'background', '{"value": "🏠", "type": "color"}', true),
('Fondo del Espacio', 'Viaje a las estrellas', 800, '🌌', 'background', '{"value": "🌌", "type": "color"}', true),

-- Poderes Activos (Categoría 'poder')
('Doble o Nada (Puntos x2)', 'Multiplica x2 los puntos de tus tareas por 24 horas', 400, '⚡', 'poder', '{"duration": 24}', true),
('Escudo (1 vida extra)', 'Te salva de perder tu racha si un día no cumples tus tareas', 300, '🛡️', 'poder', null, true),

-- Privilegios (Categoría 'privilegio', excepto Cambio de Nombre que es 'nickname' para activar la UI especial)
('Cambio de Nombre', 'Permite cambiarle el nombre a tu mascota', 200, '💍', 'nickname', null, true),
('Vale por 30 min de Ocio', 'Canjéalo para tener 30 min extra de tecnología o juegos', 150, '⏱️', 'privilegio', null, true),
('Comodín de Tarea (Pase Libre)', 'Te permite no hacer una tarea y que el admin te la perdone', 250, '🃏', 'privilegio', null, true),
('Postre a Elección', 'Elige qué postre quieres comer hoy', 200, '🍰', 'privilegio', null, true),
('Elegir Película', 'Tienes el mando del televisor, tú decides qué veremos', 300, '🎟️', 'privilegio', null, true),
('Intercambio de Tareas', 'Obliga a otro miembro a que haga tu tarea por un día', 350, '🔄', 'privilegio', null, true),
('Día de Descanso', 'Un día entero sin hacer tareas, con permiso del admin', 1000, '🏖️', 'privilegio', null, true);
