import React from 'react';
import { motion } from 'framer-motion';

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

const PetAvatar: React.FC<PetAvatarProps> = ({ member, onClick, size = 'md', isInteractive = true, fullBody = false }) => {
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
    const hasBgImage = !!bgImage && String(bgImage).startsWith('http');

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
            <motion.div
                whileHover={isInteractive ? { scale: 1.05, y: -5 } : {}}
                whileTap="tap"
                variants={containerVariants}
                onClick={onClick}
                // Fondo Completo en el Contenedor de la Mascota
                className={`relative flex items-center justify-center cursor-pointer transition-all border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden ${fullBody ? 'rounded-[2rem] aspect-[3/4] h-auto' : 'rounded-full h-auto aspect-square'} ${sizeClasses[size]}`}
                style={{
                    backgroundColor: hasBgImage ? 'transparent' : (bgImage || 'rgba(var(--color-primary), 0.1)'),
                    backgroundImage: hasBgImage ? `url(${bgImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                {/* Fallback de emoji para el fondo si no es URL */}
                {!hasBgImage && bgImage && !String(bgImage).startsWith('http') && (
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
                <div className="absolute inset-0 z-10 select-none bg-transparent pointer-events-none flex items-center justify-center">
                    {member.selected_skin ? (
                        <div className="w-full h-full flex items-center justify-center text-[1.2em]">{member.selected_skin}</div>
                    ) : member.avatar_url?.startsWith('http') ? (
                        <img
                            src={member.avatar_url}
                            alt={member.name}
                            className="absolute inset-0 w-full h-full object-contain bg-transparent"
                            style={member.active_vfx?.length ? { filter: 'drop-shadow(0px 0px 8px rgba(255,215,0,0.8))' } : {}}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[1.2em]">{member.avatar_url || '🐾'}</div>
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

                {/* Badge de Escudos */}
                {(member.shield_hp || 0) > 0 && (
                    <div className="absolute top-1 right-1 z-30 bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-md flex items-center gap-0.5 scale-90 origin-top-right">
                        <span>🛡️</span>
                        <span>x{member.shield_hp}</span>
                    </div>
                )}
            </motion.div>

            {/* Posicionamiento a un Lado (Grupo Lado) */}
            {sideAccessories.length > 0 && (
                <div style={{ position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sideAccessories.map((acc) => (
                        <div
                            key={acc.id}
                            className="w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center overflow-hidden"
                            title={acc.category}
                        >
                            {acc.icon.startsWith('http') ? (
                                <img
                                    src={acc.icon}
                                    alt={acc.category}
                                    className="w-3/4 h-3/4 object-contain drop-shadow-md"
                                />
                            ) : (
                                <span className="text-xl drop-shadow-md">
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
