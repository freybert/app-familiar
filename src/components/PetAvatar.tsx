import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface Accessory {
    id: string;
    icon: string;
    category: string;
    metadata?: any;
    is_equipped?: boolean;
}

interface Member {
    id: string;
    name: string;
    avatar_url: string;
    pet_name?: string;
    selected_background?: string;
    selected_skin?: string;
    inventory?: Accessory[];
    shield_hp?: number;
    streak?: number;
    active_vfx?: string[];
}

interface PetAvatarProps {
    member: Member;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    isInteractive?: boolean;
    fullBody?: boolean;
}

interface Medal {
    id: string;
    nombre: string;
    imagen_url: string;
    descripcion: string;
}

const PetAvatar: React.FC<PetAvatarProps> = ({ member, onClick, size = 'md', isInteractive = true, fullBody = false }) => {
    const [medallas, setMedallas] = useState<Medal[]>([]);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (!member?.id) return;

        const fetchMedallas = async () => {
            const { data, error } = await supabase
                .from('usuario_medallas')
                .select(`
                    medallas (
                        id,
                        nombre,
                        imagen_url,
                        descripcion
                    )
                `)
                .eq('user_id', member.id);

            if (data && !error) {
                // Supabase types might infer row.medallas as an array depending on the schema generation
                const meds = data.flatMap(row => row.medallas) as unknown as Medal[];
                setMedallas(meds.filter(Boolean));
            }
        };

        fetchMedallas();

        const channel = supabase.channel(`medals_${member.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'usuario_medallas', filter: `user_id=eq.${member.id}` }, fetchMedallas)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [member?.id]);

    // Clasificar el inventario equipado en fondos y accesorios
    const equippedAccessories = member.inventory?.filter(item => item.is_equipped && ['hat', 'lenses', 'crown', 'cape'].includes(item.category)) || [];
    const equippedBackground = member.inventory?.find(item => item.is_equipped && item.category === 'background');
    const equippedSkin = member.inventory?.find(item => item.is_equipped && item.category === 'skin');
    const equippedVFX = member.inventory?.find(item => item.is_equipped && item.category === 'vfx');

    const sizeClasses = {
        sm: 'w-10 h-10 text-xl',
        md: 'w-16 h-16 text-3xl',
        lg: 'w-24 h-24 text-5xl',
        xl: 'w-32 h-32 text-7xl'
    };

    const containerVariants = {
        idle: { scale: 1 },
        tap: {
            scale: 0.9,
            rotate: isInteractive ? [0, -10, 10, -10, 0] : 0,
            y: isInteractive ? -5 : 0,
            transition: { duration: 0.3 }
        }
    };

    // Fondo: Determine the background to show
    const bgImage = equippedBackground ? equippedBackground.metadata?.value || equippedBackground.icon : member.selected_background;
    const fondoUrl = !!bgImage && String(bgImage).startsWith('http') ? String(bgImage) : null;

    // Lógica de Clasificación Inteligente
    const isHeadGroup = (item: Accessory) => {
        const name = item.metadata?.name || item.category || '';
        const lowerName = name.toLowerCase();
        return ['hat', 'crown'].includes(item.category) || lowerName.includes('gorra') || lowerName.includes('gorro') || lowerName.includes('corona');
    };

    const headAccessories = equippedAccessories.filter(isHeadGroup);
    const sideAccessories = equippedAccessories.filter(item => !isHeadGroup(item));

    return (
        <div className="relative flex justify-center items-center w-full">
            {/* Medallas Izquierda */}
            {medallas.length > 0 && (
                <div className="absolute -left-5 sm:-left-12 flex flex-col gap-1 z-30 drop-shadow-md">
                    {medallas.filter((_, idx) => idx % 2 === 0).map(m => (
                        <div key={m.id} title={`${m.nombre} - ${m.descripcion}`} className="w-6 h-6 sm:w-8 sm:h-8 hover:scale-110 transition-transform cursor-help">
                            {m.imagen_url.startsWith('http') ? <img src={m.imagen_url} alt={m.nombre} className="w-full h-full object-contain" /> : <span className="text-xl sm:text-2xl">{m.imagen_url}</span>}
                        </div>
                    ))}
                </div>
            )}

            <motion.div
                whileHover={isInteractive ? { scale: 1.05, y: -5 } : {}}
                whileTap="tap"
                variants={containerVariants}
                onClick={onClick}
                // Fondo Completo en el Contenedor de la Mascota
                // Eliminados border-white dark:border-slate-800 bg colores sólidos si hay imagen.
                className={`relative flex items-center justify-center cursor-pointer transition-all border-2 shadow-sm overflow-hidden mx-auto ${fondoUrl ? 'border-transparent' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'} ${fullBody ? 'rounded-3xl' : 'rounded-full'} ${sizeClasses[size]}`}
                style={{
                    backgroundImage: fondoUrl ? `url('${fondoUrl}')` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                {/* Fallback de emoji para el fondo si no es URL */}
                {!fondoUrl && bgImage && !String(bgImage).startsWith('http') && (
                    <div className="absolute inset-0 z-0 flex items-center justify-center opacity-50 text-6xl pointer-events-none">
                        {bgImage}
                    </div>
                )}

                {/* Efectos de fondo */}
                {member.active_vfx?.includes('aura_stars') && (
                    <div className="absolute inset-0 z-[5] animate-pulse bg-primary/20 rounded-full blur-xl scale-125 pointer-events-none" />
                )}
                {member.active_vfx?.includes('fire_trail') && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-[5] scale-150 blur-[2px] opacity-60 pointer-events-none">
                        🔥
                    </div>
                )}

                {/* Mascota Principal (Transparente, superpuesta sobre el fondo) */}
                <div className="absolute inset-0 z-10 select-none bg-transparent pointer-events-none flex items-center justify-center overflow-hidden">
                    {member.selected_skin ? (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center text-[1.2em]">{member.selected_skin}</div>
                    ) : (member.avatar_url?.startsWith('http') && !imageError) ? (
                        <img
                            src={member.avatar_url}
                            alt={member.name}
                            onError={() => setImageError(true)}
                            className="absolute inset-0 w-full h-full object-contain"
                            style={member.active_vfx?.length ? { filter: 'drop-shadow(0px 0px 8px rgba(255,215,0,0.8))' } : {}}
                        />
                    ) : (
                        <div className="absolute inset-0 w-full h-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-4xl opacity-50 font-variation-settings-fill-1 drop-shadow-sm">person</span>
                        </div>
                    )}
                </div>

                {/* Efectos visuales frontales */}
                {member.active_vfx?.includes('aura_stars') && (
                    <div className="absolute inset-0 z-[15] pointer-events-none">
                        <div className="absolute top-0 left-1/4 animate-bounce delay-100">✨</div>
                        <div className="absolute bottom-1/4 right-0 animate-bounce delay-300">⭐</div>
                        <div className="absolute top-1/2 -left-2 animate-bounce delay-700 text-xs">✨</div>
                    </div>
                )}

                {/* Posicionamiento en la Cabeza (Grupo Cabeza) */}
                {headAccessories.map((acc) => (
                    <div
                        key={acc.id}
                        className="absolute z-20 pointer-events-none flex justify-center items-center drop-shadow-md"
                        // Aplicando el estilo exacto que pediste
                        style={{ top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '50%' }}
                    >
                        {acc.icon.startsWith('http') ? (
                            <img src={acc.icon} alt={acc.category} className="w-full h-auto object-contain" />
                        ) : (
                            <span style={{ fontSize: '100%' }}>{acc.icon}</span>
                        )}
                    </div>
                ))}

                {/* Capa de Evolución (Skin) con mix-blend-mode: screen */}
                {equippedSkin && (
                    <div className="absolute inset-0 z-[25] w-full h-full pointer-events-none flex items-center justify-center opacity-90" style={{ mixBlendMode: 'screen' }}>
                        {equippedSkin.icon.startsWith('http') ? (
                            <img src={equippedSkin.icon} alt={equippedSkin.category} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[3em]">{equippedSkin.icon}</span>
                        )}
                    </div>
                )}

                {/* Capa de Efectos (VFX) separada */}
                {equippedVFX && (
                    <div className="absolute inset-0 z-[26] w-full h-full pointer-events-none flex items-center justify-center">
                        {equippedVFX.icon.startsWith('http') ? (
                            <img src={equippedVFX.icon} alt={equippedVFX.category} className="w-full h-full object-cover opacity-80" />
                        ) : (
                            <span className="text-[3em] opacity-80 animate-pulse">{equippedVFX.icon}</span>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Panel de Escudo, separado para no obstruir (Badge de Escudos) */}
            {(member.shield_hp || 0) > 0 && (
                <div className="absolute top-1 right-1 z-[40] bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-0.5 origin-top-right">
                    <span>🛡️</span>
                    <span>x{member.shield_hp}</span>
                </div>
            )}

            {/* Medallas Derecha */}
            {medallas.length > 1 && (
                <div className="absolute -right-5 sm:-right-12 flex flex-col gap-1 z-30 drop-shadow-md">
                    {medallas.filter((_, idx) => idx % 2 !== 0).map(m => (
                        <div key={m.id} title={`${m.nombre} - ${m.descripcion}`} className="w-6 h-6 sm:w-8 sm:h-8 hover:scale-110 transition-transform cursor-help">
                            {m.imagen_url.startsWith('http') ? <img src={m.imagen_url} alt={m.nombre} className="w-full h-full object-contain" /> : <span className="text-xl sm:text-2xl">{m.imagen_url}</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Posicionamiento a un Lado (Grupo Lado) */}
            {sideAccessories.length > 0 && (
                <div style={{ position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 40 }}>
                    {sideAccessories.map((acc) => (
                        <div
                            key={acc.id}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center overflow-hidden"
                            title={acc.category}
                        >
                            {acc.icon.startsWith('http') ? (
                                <img
                                    src={acc.icon}
                                    alt={acc.category}
                                    className="w-3/4 h-3/4 object-contain drop-shadow-md"
                                />
                            ) : (
                                <span className="text-lg sm:text-xl drop-shadow-md">
                                    {acc.icon}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PetAvatar;
