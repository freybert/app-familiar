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

// --- DICCIONARIO DE PUNTOS DE ANCLAJE (ANCHOR POINTS) ---
// Aquí puedes configurar exactamente dónde va cada accesorio para cada tipo de mascota.
// La llave principal (ej. 'gato', 'perro', 'default') debe coincidir con member.selected_skin o el avatar_url.
const anchorPoints: Record<string, Record<string, { top: string, left: string, width: string, rotate?: string, zIndex: number }>> = {
    // Configuraciones por defecto
    default: {
        hat: { top: '-10%', left: '25%', width: '50%', rotate: '0', zIndex: 20 },
        crown: { top: '-15%', left: '30%', width: '40%', rotate: '0', zIndex: 20 },
        lenses: { top: '35%', left: '20%', width: '60%', rotate: '0', zIndex: 20 },
        cape: { top: '50%', left: '10%', width: '80%', rotate: '0', zIndex: 5 },
    },
    // León
    'https://img.icons8.com/fluency/96/lion.png': {
        hat: { top: '-15%', left: '30%', width: '40%', rotate: '0', zIndex: 20 },
        lenses: { top: '40%', left: '25%', width: '50%', rotate: '0', zIndex: 20 },
        crown: { top: '-20%', left: '35%', width: '30%', rotate: '0', zIndex: 20 },
        cape: { top: '60%', left: '0%', width: '100%', rotate: '0', zIndex: 5 }
    },
    // Oso
    'https://img.icons8.com/fluency/96/bear.png': {
        hat: { top: '-10%', left: '32%', width: '36%', rotate: '0', zIndex: 20 },
        lenses: { top: '38%', left: '26%', width: '48%', rotate: '0', zIndex: 20 },
        crown: { top: '-16%', left: '35%', width: '30%', rotate: '0', zIndex: 20 },
        cape: { top: '55%', left: '5%', width: '90%', rotate: '0', zIndex: 5 }
    },
    // Gato
    'https://img.icons8.com/fluency/96/cat.png': {
        hat: { top: '-5%', left: '30%', width: '40%', rotate: '0', zIndex: 20 },
        lenses: { top: '40%', left: '20%', width: '60%', rotate: '0', zIndex: 20 },
        crown: { top: '-12%', left: '35%', width: '30%', rotate: '0', zIndex: 20 },
        cape: { top: '50%', left: '0%', width: '100%', rotate: '0', zIndex: 5 }
    },
    // Perro
    'https://img.icons8.com/fluency/96/dog.png': {
        hat: { top: '-8%', left: '25%', width: '50%', rotate: '0', zIndex: 20 },
        lenses: { top: '35%', left: '15%', width: '70%', rotate: '0', zIndex: 20 },
        crown: { top: '-15%', left: '30%', width: '40%', rotate: '0', zIndex: 20 },
        cape: { top: '50%', left: '5%', width: '90%', rotate: '0', zIndex: 5 }
    },
    // Conejo
    'https://img.icons8.com/fluency/96/rabbit.png': {
        hat: { top: '-5%', left: '35%', width: '30%', rotate: '0', zIndex: 20 },
        lenses: { top: '45%', left: '28%', width: '44%', rotate: '0', zIndex: 20 },
        crown: { top: '-2%', left: '40%', width: '20%', rotate: '0', zIndex: 20 },
        cape: { top: '65%', left: '10%', width: '80%', rotate: '0', zIndex: 5 }
    },
    // Panda
    'https://img.icons8.com/fluency/96/panda.png': {
        hat: { top: '-12%', left: '30%', width: '40%', rotate: '0', zIndex: 20 },
        lenses: { top: '42%', left: '20%', width: '60%', rotate: '0', zIndex: 20 },
        crown: { top: '-18%', left: '35%', width: '30%', rotate: '0', zIndex: 20 },
        cape: { top: '60%', left: '0%', width: '100%', rotate: '0', zIndex: 5 }
    },
    // Zorro
    'https://img.icons8.com/fluency/96/fox.png': {
        hat: { top: '-5%', left: '32%', width: '36%', rotate: '0', zIndex: 20 },
        lenses: { top: '40%', left: '15%', width: '70%', rotate: '0', zIndex: 20 },
        crown: { top: '-15%', left: '35%', width: '30%', rotate: '0', zIndex: 20 },
        cape: { top: '55%', left: '-5%', width: '110%', rotate: '0', zIndex: 5 }
    },
    // Koala
    'https://img.icons8.com/fluency/96/koala.png': {
        hat: { top: '-10%', left: '25%', width: '50%', rotate: '0', zIndex: 20 },
        lenses: { top: '40%', left: '15%', width: '70%', rotate: '0', zIndex: 20 },
        crown: { top: '-15%', left: '30%', width: '40%', rotate: '0', zIndex: 20 },
        cape: { top: '60%', left: '0%', width: '100%', rotate: '0', zIndex: 5 }
    },
    // Serpiente
    'https://img.icons8.com/fluency/96/snake.png': {
        hat: { top: '-10%', left: '40%', width: '25%', rotate: '0', zIndex: 20 },
        lenses: { top: '25%', left: '35%', width: '35%', rotate: '0', zIndex: 20 },
        crown: { top: '-15%', left: '42%', width: '20%', rotate: '0', zIndex: 20 },
        cape: { top: '40%', left: '20%', width: '60%', rotate: '0', zIndex: 5 }
    }
};

const PetAvatar: React.FC<PetAvatarProps> = ({ member, onClick, size = 'md', isInteractive = true, fullBody = false }) => {
    const equippedAccessories = member.inventory?.filter(item => item.is_equipped && ['hat', 'lenses', 'crown', 'cape'].includes(item.category)) || [];
    const equippedBackground = member.inventory?.find(item => item.is_equipped && item.category === 'background');

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
            y: isInteractive ? -20 : 0,
            transition: { duration: 0.3 }
        }
    };

    // Determine the background to show. If an item is equipped, use its icon (which should be an image URL for backgrounds). 
    // Otherwise fallback to selected_background string.
    const bgImage = equippedBackground ? equippedBackground.metadata?.value || equippedBackground.icon : member.selected_background;
    const hasBgImage = !!bgImage && String(bgImage).startsWith('http');

    // Detectar el tipo de mascota actual para buscar sus Anclas. 
    // Usaremos el selected_skin o el avatar_url.
    const petIdentifier = member.selected_skin || member.avatar_url || 'default';
    const currentPetAnchors = anchorPoints[petIdentifier] || anchorPoints['default'];

    return (
        <motion.div
            whileHover={isInteractive ? { scale: 1.05, y: -5 } : {}}
            whileTap="tap"
            variants={containerVariants}
            onClick={onClick}
            // CAPA 1 (Contenedor y Fondo Base) - position: relative y tamaño fijo
            className={`relative flex items-center justify-center cursor-pointer overflow-hidden transition-all border-2 border-white dark:border-slate-800 shadow-sm bg-cover bg-center ${fullBody ? 'rounded-[2rem] aspect-[3/4] h-auto' : 'rounded-full h-auto aspect-square'} ${sizeClasses[size]}`}
            style={{
                backgroundImage: hasBgImage ? `url(${bgImage})` : 'none',
                backgroundColor: hasBgImage ? 'transparent' : (bgImage || 'rgba(var(--color-primary), 0.1)')
            }}
        >
            {/* Si el fondo es un emoji y no imagen URL */}
            {!hasBgImage && bgImage && !String(bgImage).startsWith('http') && (
                <div className="absolute inset-0 z-0 flex items-center justify-center opacity-50 text-6xl pointer-events-none">
                    {bgImage}
                </div>
            )}

            {/* Visual Effects (VFX) - Entre el fondo y la mascota */}
            {member.active_vfx?.includes('aura_stars') && (
                <div className="absolute inset-0 z-[5] animate-pulse bg-primary/20 rounded-full blur-xl scale-125 pointer-events-none" />
            )}
            {member.active_vfx?.includes('aura_stars') && (
                <div className="absolute inset-0 z-[15] pointer-events-none">
                    <div className="absolute top-0 left-1/4 animate-bounce delay-100">✨</div>
                    <div className="absolute bottom-1/4 right-0 animate-bounce delay-300">⭐</div>
                    <div className="absolute top-1/2 -left-2 animate-bounce delay-700 text-xs">✨</div>
                </div>
            )}
            {member.active_vfx?.includes('fire_trail') && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-[5] scale-150 blur-[2px] opacity-60 pointer-events-none">
                    🔥
                </div>
            )}

            {/* CAPA 2 (Mascota) - position: absolute, w-full, h-full, object-contain, z-index: 10 */}
            <div className="absolute inset-0 z-10 select-none bg-transparent pointer-events-none">
                {member.selected_skin ? (
                    <div className="w-full h-full flex items-center justify-center text-[1.2em]">{member.selected_skin}</div>
                ) : member.avatar_url?.startsWith('http') ? (
                    <img
                        src={member.avatar_url}
                        alt={member.name}
                        className="w-full h-full object-contain bg-transparent"
                        style={member.active_vfx?.length ? { filter: 'drop-shadow(0px 0px 8px rgba(255,215,0,0.8))' } : {}}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[1.2em]">{member.avatar_url || '🐾'}</div>
                )}
            </div>

            {/* CAPA 3 (Objetos/Ropa) - Anclajes Dinámicos */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                {equippedAccessories.map((acc) => {
                    // Leemos el anclaje específico para esta categoría (o usamos valores por defecto seguros)
                    const anchor = currentPetAnchors[acc.category] || anchorPoints['default'][acc.category] || { top: '0%', left: '0%', width: '50%', rotate: '0', zIndex: 20 };

                    return (
                        <div
                            key={acc.id}
                            className="absolute flex items-center justify-center drop-shadow-lg"
                            style={{
                                top: anchor.top,
                                left: anchor.left,
                                width: anchor.width,
                                transform: `rotate(${anchor.rotate || 0}deg)`,
                                zIndex: anchor.zIndex
                            }}
                        >
                            {/* La imagen o icono del objeto asume el 100% del ancho del contenedor anclado */}
                            {acc.icon.startsWith('http') ? (
                                <img src={acc.icon} alt={acc.category} className="w-full h-auto object-contain" />
                            ) : (
                                <span style={{ fontSize: '1em', width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    {acc.icon}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Shield HP Badge */}
            {(member.shield_hp || 0) > 0 && (
                <div className="absolute top-1 right-1 z-30 bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-md flex items-center gap-0.5 scale-90 origin-top-right">
                    <span>🛡️</span>
                    <span>x{member.shield_hp}</span>
                </div>
            )}
        </motion.div>
    );
};

export default PetAvatar;
