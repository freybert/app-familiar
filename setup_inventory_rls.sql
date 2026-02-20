-- 1. Crear tabla de inventario (user_items)
CREATE TABLE IF NOT EXISTS public.user_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('cosmetico', 'poder')),
    equipado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas RLS (Solo auth.uid())
DROP POLICY IF EXISTS "Ver propio inventario" ON public.user_items;
CREATE POLICY "Ver propio inventario" 
ON public.user_items 
FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Insertar en propio inventario" ON public.user_items;
CREATE POLICY "Insertar en propio inventario" 
ON public.user_items 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Actualizar propio inventario" ON public.user_items;
CREATE POLICY "Actualizar propio inventario" 
ON public.user_items 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
