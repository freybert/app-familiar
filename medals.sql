-- Tabla: medallas
CREATE TABLE IF NOT EXISTS public.medallas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    imagen_url TEXT NOT NULL,
    descripcion TEXT
);

-- Tabla: usuario_medallas
CREATE TABLE IF NOT EXISTS public.usuario_medallas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    medalla_id UUID NOT NULL REFERENCES public.medallas(id) ON DELETE CASCADE,
    fecha_otorgada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, medalla_id) -- Un usuario no puede tener la misma medalla dos veces
);

-- Habilitar RLS
ALTER TABLE public.medallas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_medallas ENABLE ROW LEVEL SECURITY;

-- Políticas para 'medallas'
-- Todos pueden ver las medallas
CREATE POLICY "Medallas son visibles para todos"
    ON public.medallas FOR SELECT
    USING (true);

-- Solo el admin puede modificar
-- Asumiendo que podemos verificar si el auth.uid() es admin haciendo join con family_members:
CREATE POLICY "Solo admin puede insertar medallas"
    ON public.medallas FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM family_members WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Solo admin puede actualizar medallas"
    ON public.medallas FOR UPDATE
    USING (EXISTS (SELECT 1 FROM family_members WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Solo admin puede eliminar medallas"
    ON public.medallas FOR DELETE
    USING (EXISTS (SELECT 1 FROM family_members WHERE id = auth.uid() AND is_admin = true));


-- Políticas para 'usuario_medallas'
-- Todos pueden ver las medallas de los usuarios
CREATE POLICY "Medallas de usuario son visibles para todos"
    ON public.usuario_medallas FOR SELECT
    USING (true);

-- Solo admin puede otorgar (insert) o quitar (delete)
CREATE POLICY "Solo admin puede otorgar medallas"
    ON public.usuario_medallas FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM family_members WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Solo admin puede quitar medallas"
    ON public.usuario_medallas FOR DELETE
    USING (EXISTS (SELECT 1 FROM family_members WHERE id = auth.uid() AND is_admin = true));
