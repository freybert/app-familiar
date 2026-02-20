import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import PetAvatar from './PetAvatar';

interface Accessory {
    id: string; // Inventory entry ID
    item_id: string; // shop_items ID
    icon: string;
    name: string;
    category: string;
    description: string;
    metadata?: any;
    is_equipped?: boolean;
    quantity: number;
}

interface Member {
    id: string;
    name: string;
    avatar_url: string;
    total_points: number;
    shield_hp: number;
    pet_name?: string;
    selected_background?: string;
    selected_skin?: string;
    hidden_until?: string;
    double_points_until?: string;
    active_vfx?: string[];
}

interface PetDetailsModalProps {
    member: Member;
    isOpen: boolean;
    onClose: () => void;
    isOwnPet: boolean;
    onShopClick: () => void;
}

const PetDetailsModal: React.FC<PetDetailsModalProps> = ({ member, isOpen, onClose, isOwnPet, onShopClick }) => {
    const [petName, setPetName] = useState(member.pet_name || '');
    const [inventory, setInventory] = useState<Accessory[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchInventory();
        }
    }, [isOpen, member.id]);

    const fetchInventory = async () => {
        setLoading(true);
        const { data: invData } = await supabase
            .from('user_items')
            .select(`
                *,
                shop_items (*)
            `)
            .eq('user_id', member.id);

        if (invData) {
            const items = invData.map((inv: any) => ({
                id: inv.id,
                item_id: inv.shop_items.id,
                name: inv.shop_items.name,
                description: inv.shop_items.description,
                icon: inv.shop_items.icon,
                category: inv.shop_items.category,
                metadata: inv.shop_items.metadata,
                is_equipped: inv.equipado, // Mapped to the new SQL column
                quantity: 1 // Single row instances now
            }));
            setInventory(items);
        }
        setLoading(false);
    };

    const activateItem = async (invItem: Accessory) => {
        if (!isOwnPet) return;

        try {
            // 1. Activation Logic based on item type/name
            if (invItem.name.includes('Escudo')) {
                const { error } = await supabase
                    .from('family_members')
                    .update({ shield_hp: (member.shield_hp || 0) + 1 })
                    .eq('id', member.id);
                if (error) throw error;
                alert('🛡️ ¡Escudo activado! +1 HP añadido.');
            } else if (invItem.category === 'voucher') {
                alert(`🎟️ VALE ACTIVADO: "${invItem.name}".\n\nMuéstrale esto al Administrador para canjear tu beneficio real. El objeto ha sido consumido.`);
                // Notify Admin (optional: could insert into a notifications table)
            } else if (invItem.category === 'travesura') {
                if (invItem.name.includes('Niebla')) {
                    const until = new Date();
                    until.setHours(until.getHours() + (invItem.metadata?.duration || 24));
                    await supabase.from('family_members').update({ hidden_until: until.toISOString() }).eq('id', member.id);
                    alert('🌫️ Niebla activada. Tu puntaje estará oculto por 24 horas.');
                } else if (invItem.metadata?.type === 'double_points') {
                    // Lock: Prevent duplicate active effect
                    if (member.double_points_until && new Date(member.double_points_until) > new Date()) {
                        alert('⚡ ¡Ya tienes un Poder x2 activo! Espera a que termine para usar otro.');
                        return; // Exit without consuming
                    }
                    const until = new Date();
                    until.setHours(until.getHours() + (invItem.metadata?.duration || 24));
                    await supabase.from('family_members').update({ double_points_until: until.toISOString() }).eq('id', member.id);
                }
            } else if (invItem.category === 'vfx') {
                const currentVfx = member.active_vfx || [];
                const vfxType = invItem.metadata?.type || invItem.name;
                if (!currentVfx.includes(vfxType)) {
                    const { error } = await supabase.from('family_members').update({ active_vfx: [...currentVfx, vfxType] }).eq('id', member.id);
                    if (error) throw error;
                    alert(`✨ ¡Efecto "${invItem.name}" activado!`);
                } else {
                    alert('✨ Ya tienes este efecto activo.');
                    return; // Don't consume
                }
            }

            // 2. Consume Item (Delete row)
            await supabase.from('user_items').delete().eq('id', invItem.id);

            fetchInventory(); // Refresh everything
        } catch (error) {
            console.error('Error activating item:', error);
            alert('Error al activar el objeto.');
        }
    };

    const handleSavePetName = async () => {
        if (!isOwnPet) return;
        setSaving(true);
        const { error } = await supabase
            .from('family_members')
            .update({ pet_name: petName })
            .eq('id', member.id);

        if (!error) {
            alert('🏷️ ¡Nombre actualizado!');
        }
        setSaving(false);
    };

    const toggleEquip = async (itemId: string, category: string) => {
        if (!isOwnPet) return;

        const item = inventory.find(i => i.id === itemId);
        if (!item) return;

        const isAccessory = ['hat', 'lenses', 'crown', 'cape', 'skin', 'background'].includes(category);
        if (!isAccessory) {
            activateItem(item);
            return;
        }

        const newEquipped = !item.is_equipped;

        // If background or skin, unequip others first
        if (newEquipped && ['background', 'skin'].includes(category)) {
            await supabase.from('user_items').update({ equipado: false }).eq('user_id', member.id);
            // Re-fetch or local update will be needed, for now just update this one
        }

        const { error } = await supabase
            .from('user_items')
            .update({ equipado: newEquipped })
            .eq('id', itemId);

        if (!error) {
            // Local update
            setInventory(prev => prev.map(i => {
                if (i.id === itemId) return { ...i, is_equipped: newEquipped };
                if (newEquipped && i.category === category && ['background', 'skin'].includes(category)) return { ...i, is_equipped: false };
                return i;
            }));

            if (category === 'background') {
                await supabase.from('family_members').update({ selected_background: newEquipped ? item.metadata?.value : null }).eq('id', member.id);
            }
            if (category === 'skin') {
                await supabase.from('family_members').update({ selected_skin: newEquipped ? item.metadata?.value : null }).eq('id', member.id);
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header Image/Background */}
                        <div className="h-48 bg-gradient-to-br from-primary to-purple-600 relative flex items-center justify-center">
                            <div className="absolute top-4 right-4 z-20">
                                <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-sm transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <PetAvatar member={{ ...member, inventory }} size="xl" isInteractive={true} fullBody={true} />

                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-6 py-2 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 text-center">
                                    {member.pet_name || 'Mascota Sin Nombre'}
                                </h2>

                                {/* Buffs & State Zone */}
                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap justify-center gap-2">
                                    {/* Active Buffs */}
                                    {(member.shield_hp || 0) > 0 && <span className="text-sm" title={`Escudo (HP: ${member.shield_hp})`}>🛡️</span>}
                                    {member.double_points_until && new Date(member.double_points_until) > new Date() && <span className="text-sm" title="¡Puntos x2 Activo!">⚡</span>}
                                    {member.hidden_until && new Date(member.hidden_until) > new Date() && <span className="text-sm" title="Ranking oculto">🌫️</span>}
                                    {member.active_vfx && member.active_vfx.length > 0 && member.active_vfx.map(vfx => (
                                        <span key={vfx} className="text-sm" title="Efecto visual activo">✨</span>
                                    ))}

                                    {/* Divided Ready-to-Use items */}
                                    {inventory.filter(i => !['hat', 'lenses', 'crown', 'cape', 'skin', 'background', 'nickname'].includes(i.category)).length > 0 && (
                                        <div className="flex items-center pl-2 ml-2 border-l border-slate-200 dark:border-slate-600 gap-1 opacity-60 grayscale-[0.3]">
                                            {inventory.filter(i => !['hat', 'lenses', 'crown', 'cape', 'skin', 'background', 'nickname'].includes(i.category)).map(item => (
                                                <span key={item.id} className="text-xs" title={`Listo para usar: ${item.name}`}>
                                                    {item.icon}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 pt-12 space-y-8 scrollbar-hide">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Puntos</p>
                                    <p className="text-2xl font-black text-primary flex items-center gap-1">
                                        🪙 {member.total_points}
                                    </p>
                                </div>
                                <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-3xl border border-blue-500/20">
                                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-1">Escudo 🛡️</p>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-2xl font-black text-blue-500">{member.shield_hp} <span className="text-xs uppercase">HP</span></p>
                                        <div className="w-full bg-blue-500/20 h-2 rounded-full overflow-hidden">
                                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, member.shield_hp * 20)}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Nickname (Editable if own) */}
                            {isOwnPet && (
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Cambiar Apodo</label>
                                    {inventory.some(i => i.category === 'nickname') ? (
                                        <div className="flex gap-2">
                                            <input
                                                value={petName}
                                                onChange={e => setPetName(e.target.value)}
                                                placeholder="Ej. El Guardian"
                                                className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none focus:border-primary transition-colors"
                                            />
                                            <button
                                                onClick={handleSavePetName}
                                                disabled={saving}
                                                className="bg-primary text-slate-900 font-black px-6 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                            >
                                                {saving ? '...' : 'OK'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-xs font-bold text-slate-400">💍 Compra un "Apodo" en el Bazar para cambiar el nombre de tu mascota.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Items / Inventory (Divided in 2) */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">inventory_2</span>
                                    Mi Inventario
                                </h3>

                                {loading ? (
                                    <div className="text-center py-10 animate-pulse text-slate-400 font-bold">Cargando ítems...</div>
                                ) : inventory.length === 0 ? (
                                    <div className="p-10 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-slate-400 font-bold">¡Vaya! No tienes objetos aún.</p>
                                        <button onClick={onShopClick} className="mt-4 text-primary font-black uppercase text-xs hover:underline">Visitar el Bazar</button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Objects to ACTIVATE */}
                                        {inventory.filter(i => !['hat', 'lenses', 'crown', 'cape', 'skin', 'background'].includes(i.category)).length > 0 && (
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Para Usar</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {inventory.filter(i => !['hat', 'lenses', 'crown', 'cape', 'skin', 'background'].includes(i.category)).map(item => (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => activateItem(item)}
                                                            className="p-4 rounded-3xl border-2 border-slate-100 dark:border-slate-700 hover:border-primary bg-white dark:bg-slate-900 transition-all cursor-pointer group relative overflow-hidden"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-sm">
                                                                    {item.icon}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-bold text-xs truncate">{item.name}</p>
                                                                    <p className="text-[9px] font-black uppercase text-primary">Cantidad: {item.quantity}</p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex justify-end">
                                                                <span className="text-[9px] font-black bg-primary text-slate-900 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">USAR AHORA</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Accessories to EQUIP */}
                                        {inventory.filter(i => ['hat', 'lenses', 'crown', 'cape', 'skin', 'background'].includes(i.category)).length > 0 && (
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Armario</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {inventory.filter(i => ['hat', 'lenses', 'crown', 'cape', 'skin', 'background'].includes(i.category)).map(item => (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => toggleEquip(item.id, item.category)}
                                                            className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-3 ${item.is_equipped ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-2xl shadow-sm">
                                                                {item.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-xs truncate">{item.name}</p>
                                                                <p className="text-[9px] font-black uppercase text-slate-400">{item.is_equipped ? 'Equipado' : 'Guardado'}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={onShopClick}
                                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-3xl shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined">shopping_cart</span>
                                IR AL BAZAR
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PetDetailsModal;
