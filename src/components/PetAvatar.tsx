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
    const equippedAccessories = member.inventory?.filter(item => item.is_equipped && ['hat', 'lenses', 'crown', 'cape'].includes(item.category)) || [];

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

    const getPositionStyle = (category: string) => {
        switch (category) {
            case 'hat': return { top: '-25%', left: '0%', zIndex: 30 };
            case 'crown': return { top: '-30%', left: '0%', zIndex: 30 };
            case 'lenses': return { top: '5%', left: '0%', zIndex: 30 };
            case 'cape': return { top: '10%', left: '-15%', zIndex: 5 }; // Behind the pet slightly or below
            default: return { top: '0', left: '0', zIndex: 20 };
        }
    };

    return (
        <motion.div
            whileHover={isInteractive ? { scale: 1.05, y: -5 } : {}}
            whileTap="tap"
            variants={containerVariants}
            onClick={onClick}
            className={`relative flex items-center justify-center cursor-pointer overflow-hidden transition-all border-2 border-white dark:border-slate-800 shadow-sm ${fullBody ? 'rounded-[2rem] aspect-[3/4] h-auto' : 'rounded-full h-auto aspect-square'} ${sizeClasses[size]}`}
            style={{
                background: member.selected_background || 'transparent',
                backgroundColor: member.selected_background ? undefined : 'rgba(var(--color-primary), 0.1)'
            }}
        >
            {/* Visual Effects (VFX) Layers */}
            {member.active_vfx?.includes('aura_stars') && (
                <div className="absolute inset-0 z-0 animate-pulse bg-primary/20 rounded-full blur-xl scale-125" />
            )}
            {member.active_vfx?.includes('aura_stars') && (
                <div className="absolute inset-0 z-30 pointer-events-none">
                    <div className="absolute top-0 left-1/4 animate-bounce delay-100">✨</div>
                    <div className="absolute bottom-1/4 right-0 animate-bounce delay-300">⭐</div>
                    <div className="absolute top-1/2 -left-2 animate-bounce delay-700 text-xs">✨</div>
                </div>
            )}
            {member.active_vfx?.includes('fire_trail') && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-0 scale-150 blur-[2px] opacity-60">
                    🔥
                </div>
            )}
            {/* Background Layer */}
            {member.selected_background && (
                <div className="absolute inset-0 opacity-50 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${member.selected_background})` }} />
            )}

            {/* Base Pet */}
            <div className="relative z-10 select-none">
                {member.selected_skin ? (
                    <span className="text-[1.2em]">{member.selected_skin}</span>
                ) : member.avatar_url?.startsWith('http') ? (
                    <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[1.2em]">{member.avatar_url || '🐾'}</span>
                )}
            </div>

            {/* Accessory Overlays */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {equippedAccessories.map((acc) => {
                    const defaultPos = getPositionStyle(acc.category);
                    return (
                        <div key={acc.id} className="absolute text-[0.8em] drop-shadow-lg" style={{
                            top: acc.metadata?.pos?.top || defaultPos.top,
                            left: acc.metadata?.pos?.left || defaultPos.left,
                            transform: `rotate(${acc.metadata?.pos?.rotate || 0}deg)`,
                            zIndex: defaultPos.zIndex
                        }}>
                            {acc.icon}
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
