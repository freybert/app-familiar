import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: string;
    category: string;
    metadata?: any;
}

interface Member {
    id: string;
    name: string;
    total_points: number;
    shield_hp: number;
}

interface UserInventoryItem {
    item_id: string;
}

interface ShopViewProps {
    currentUser: any;
}

const CATEGORIES = [
    { id: 'all', label: 'Todo', icon: 'apps' },
    { id: 'hat', label: 'Sombreros', icon: 'hat' },
    { id: 'lenses', label: 'Lentes', icon: 'visibility' },
    { id: 'crown', label: 'Coronas', icon: 'workspace_premium' },
    { id: 'cape', label: 'Capas', icon: 'layers' },
    { id: 'background', label: 'Fondos', icon: 'image' },
    { id: 'skin', label: 'Evoluciones', icon: 'auto_fix_high' },
    { id: 'travesura', label: 'Travesuras', icon: 'psychology_alt' },
    { id: 'vfx', label: 'Efectos', icon: 'magic_button' },
    { id: 'voucher', label: 'Vales', icon: 'confirmation_number' },
    { id: 'nickname', label: 'Apodos', icon: 'edit_note' },
    { id: 'other', label: 'Otros', icon: 'inventory_2' }
];

const ShopView: React.FC<ShopViewProps> = ({ currentUser }) => {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [inventory, setInventory] = useState<Set<string>>(new Set());
    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('shop_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_items' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members', filter: `id=eq.${currentUser.id}` }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser.id]);

    const fetchData = async () => {
        setLoading(true);
        const { data: itemsData } = await supabase
            .from('shop_items')
            .select('*')
            .order('cost', { ascending: true });

        const { data: inventoryData } = await supabase
            .from('user_inventory')
            .select('item_id')
            .eq('user_id', currentUser.id);

        const { data: memberData } = await supabase
            .from('family_members')
            .select('id, name, total_points, shield_hp')
            .eq('id', currentUser.id)
            .single();

        if (itemsData) setItems(itemsData);
        if (inventoryData) {
            setInventory(new Set(inventoryData.map((i: any) => i.item_id)));
        }
        if (memberData) setMember(memberData);
        setLoading(false);
    };

    const handleBuy = async (item: ShopItem) => {
        if (!member) return;

        // Accessories and skins are still one-time purchases
        const isOneTime = ['hat', 'lenses', 'crown', 'cape', 'skin', 'background', 'nickname'].includes(item.category);
        if (isOneTime && inventory.has(item.id)) {
            alert('¡Ya tienes este artículo!');
            return;
        }

        if (member.total_points < item.cost) {
            alert('❌ No tienes puntos suficientes para este artículo.');
            return;
        }

        const confirmPurchase = window.confirm(`¿Confirmas el canje de ${item.cost} puntos por "${item.name}"?`);

        if (confirmPurchase) {
            setBuyingId(item.id);
            try {
                // 1. Deduct points
                const newPoints = member.total_points - item.cost;
                const { error: updateError } = await supabase
                    .from('family_members')
                    .update({ total_points: newPoints })
                    .eq('id', member.id);

                if (updateError) throw updateError;

                // 2. Inventory Logic: All functional items and accessories go to inventory
                // Check if already in inventory to update quantity
                const { data: existingInv } = await supabase
                    .from('user_inventory')
                    .select('id, quantity')
                    .eq('user_id', currentUser.id)
                    .eq('item_id', item.id)
                    .single();

                if (existingInv) {
                    const { error: invError } = await supabase
                        .from('user_inventory')
                        .update({ quantity: (existingInv.quantity || 1) + 1 })
                        .eq('id', existingInv.id);
                    if (invError) throw invError;
                } else {
                    const { error: invError } = await supabase
                        .from('user_inventory')
                        .insert([{
                            user_id: currentUser.id,
                            item_id: item.id,
                            is_equipped: false,
                            quantity: 1
                        }]);
                    if (invError) throw invError;
                }

                // 3. Local State Sync
                setMember({ ...member, total_points: newPoints });
                if (isOneTime) {
                    setInventory(new Set([...Array.from(inventory), item.id]));
                }

                alert(`✅ ¡Éxito! Has canjeado "${item.name}". Se ha guardado en tu inventario.`);
            } catch (error) {
                console.error('Error in purchase:', error);
                alert('Hubo un error al procesar tu compra.');
            } finally {
                setBuyingId(null);
            }
        }
    };

    const filteredItems = selectedCategory === 'all'
        ? items
        : items.filter(i => i.category === selectedCategory);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-primary font-black uppercase tracking-widest text-sm">Abriendo Bazar...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark p-4 pb-24 font-display">
            <header className="mb-6 p-6 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
                    <span className="material-symbols-outlined text-9xl text-primary">shopping_bag</span>
                </div>

                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        Bazar de Estilo
                    </h1>
                    <p className="text-slate-400 text-sm font-bold mt-1">Personaliza tu mascota y racha</p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <div className="bg-primary px-4 py-2 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2">
                            <span className="text-slate-900 font-black flex items-center gap-1">
                                🪙 {member?.total_points || 0}
                                <span className="text-[10px] uppercase opacity-50">PTS</span>
                            </span>
                        </div>
                        {(member?.shield_hp ?? 0) > 0 && (
                            <div className="bg-blue-500/10 px-4 py-2 rounded-2xl border border-blue-500/20 flex items-center gap-2">
                                <span className="text-blue-500 font-black flex items-center gap-1">
                                    🛡️ {member?.shield_hp}
                                    <span className="text-[10px] uppercase opacity-50">HP</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar px-1">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border-2 ${selectedCategory === cat.id
                            ? 'bg-primary border-primary text-slate-900 shadow-lg shadow-primary/20 scale-105'
                            : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 text-slate-400 hover:border-slate-200'}`}
                    >
                        <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800">
                        <p className="text-slate-300 font-black">No hay artículos en esta categoría.</p>
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const isOneTime = ['hat', 'lenses', 'crown', 'cape', 'skin', 'background', 'nickname'].includes(item.category);
                        const isOwned = isOneTime && inventory.has(item.id);
                        return (
                            <div key={item.id} className={`bg-white dark:bg-slate-800 p-5 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-xl ${isOwned ? 'opacity-80' : ''}`}>
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-4xl shadow-inner">
                                        {item.icon || '🎁'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg line-clamp-1">{item.name}</h3>
                                            {isOwned && <span className="text-emerald-500 material-symbols-outlined text-sm font-black">check_circle</span>}
                                        </div>
                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full w-fit mt-1">{item.category}</p>
                                        <p className="text-xs text-slate-400 font-bold mt-2 leading-snug">{item.description}</p>
                                    </div>
                                </div>

                                <div className="mt-auto flex items-center justify-between gap-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                                    <div className="flex flex-col">
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Inversión</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none">🪙 {item.cost}</p>
                                    </div>
                                    <button
                                        onClick={() => handleBuy(item)}
                                        disabled={buyingId !== null || isOwned}
                                        className={`px-6 h-12 rounded-2xl font-black transition-all flex items-center gap-2 ${isOwned
                                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
                                            : member && member.total_points >= item.cost
                                                ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'
                                                : 'bg-red-50 text-red-200 cursor-not-allowed'
                                            }`}
                                    >
                                        {buyingId === item.id ? (
                                            <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                                        ) : isOwned ? 'Adquirido' : (
                                            <>
                                                <span className="material-symbols-outlined text-sm">shopping_cart</span>
                                                Canjear
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ShopView;
