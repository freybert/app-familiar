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
    streak_count: number;
    inventory?: any[];
}

const ShopManagement: React.FC = () => {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<string>('');
    const [memberInventory, setMemberInventory] = useState<any[]>([]);
    const [adjustmentAmount, setAdjustmentAmount] = useState<string>('0');
    const [newItemName, setNewItemName] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemCost, setNewItemCost] = useState('0');
    const [newItemIcon, setNewItemIcon] = useState('🎁');
    const [newItemCategory, setNewItemCategory] = useState('other');
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [loading, setLoading] = useState(false);

    // I need to find where members are fetched and update that
    const fetchItems = async () => {
        const { data: itemsData } = await supabase.from('shop_items').select('*').order('created_at', { ascending: false });
        if (itemsData) setItems(itemsData);

        const { data: membersData } = await supabase.from('family_members').select('id, name, total_points, shield_hp, streak_count');
        if (membersData) setMembers(membersData as Member[]);

        if (selectedMember) {
            fetchMemberInventory(selectedMember);
        }
    };

    const fetchMemberInventory = async (memberId: string) => {
        const { data: invData } = await supabase
            .from('user_inventory')
            .select('*, shop_items(*)')
            .eq('user_id', memberId);
        if (invData) setMemberInventory(invData);
    };

    useEffect(() => {
        if (selectedMember) {
            fetchMemberInventory(selectedMember);
        }
    }, [selectedMember]);

    const handleSave = async () => {
        if (!newItemName.trim()) return;
        setLoading(true);

        const itemData = {
            name: newItemName,
            description: newItemDesc,
            cost: parseInt(newItemCost) || 0,
            icon: newItemIcon,
            category: newItemCategory,
            metadata: {} // Default empty metadata
        };

        if (editingItem) {
            const { error } = await supabase.from('shop_items').update(itemData).eq('id', editingItem.id);
            if (!error) {
                setEditingItem(null);
                resetForm();
                fetchItems();
            }
        } else {
            const { error } = await supabase.from('shop_items').insert([itemData]);
            if (!error) {
                resetForm();
                fetchItems();
            }
        }
        setLoading(false);
    };

    const resetForm = () => {
        setNewItemName('');
        setNewItemDesc('');
        setNewItemCost('0');
        setNewItemIcon('🎁');
        setNewItemCategory('other');
        setEditingItem(null);
    };

    const startEdit = (item: ShopItem) => {
        setEditingItem(item);
        setNewItemName(item.name);
        setNewItemDesc(item.description);
        setNewItemCost(item.cost.toString());
        setNewItemIcon(item.icon);
        setNewItemCategory(item.category || 'other');
    };

    const deleteItem = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este artículo?')) {
            const { error } = await supabase.from('shop_items').delete().eq('id', id);
            if (!error) fetchItems();
        }
    };

    const handleGiftPoints = async () => {
        if (!selectedMember || !adjustmentAmount) return;
        setLoading(true);
        const amount = parseInt(adjustmentAmount);
        const member = members.find(m => m.id === selectedMember);
        if (member) {
            const { error } = await supabase
                .from('family_members')
                .update({ total_points: (member.total_points || 0) + amount })
                .eq('id', selectedMember);
            if (!error) {
                alert(`🎁 ¡Éxito! Se han entregado ${amount} puntos a ${member.name}.`);
                fetchItems();
            }
        }
        setLoading(false);
    };

    const handleGiftHP = async () => {
        if (!selectedMember || !adjustmentAmount) return;
        setLoading(true);
        const amount = parseInt(adjustmentAmount);
        const member = members.find(m => m.id === selectedMember);
        if (member) {
            const { error } = await supabase
                .from('family_members')
                .update({ shield_hp: (member.shield_hp || 0) + amount })
                .eq('id', selectedMember);
            if (!error) {
                alert(`🛡️ ¡Éxito! Se han entregado ${amount} HP a ${member.name}.`);
                fetchItems();
            }
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            {/* Manual Adjustments */}
            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">card_giftcard</span>
                    Regalos y Ajustes (Admin)
                </h3>
                <div className="space-y-3">
                    <select
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold"
                        value={selectedMember}
                        onChange={e => setSelectedMember(e.target.value)}
                    >
                        <option value="">Seleccionar Miembro</option>
                        {members.map(m => (
                            <option key={m.id} value={m.id}>{m.name} (Puntos: {m.total_points}, HP: {m.shield_hp})</option>
                        ))}
                    </select>

                    {selectedMember && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Inventario del Miembro</p>
                            <div className="flex flex-wrap gap-2">
                                {memberInventory.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 italic">Inventario vacío</p>
                                ) : (
                                    memberInventory.map(inv => (
                                        <div key={inv.id} className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                                            <span className="text-sm">{inv.shop_items.icon}</span>
                                            <span className="text-[10px] font-bold">{inv.shop_items.name} x{inv.quantity}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <input
                            type="number"
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold"
                            placeholder="Cantidad"
                            value={adjustmentAmount}
                            onChange={e => setAdjustmentAmount(e.target.value)}
                        />
                        <button onClick={handleGiftPoints} className="bg-yellow-400 text-slate-900 font-bold px-4 rounded-xl text-xs hover:scale-105 active:scale-95 transition-all">
                            Dar Puntos
                        </button>
                        <button onClick={handleGiftHP} className="bg-blue-400 text-white font-bold px-4 rounded-xl text-xs hover:scale-105 active:scale-95 transition-all">
                            Dar HP 🛡️
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">storefront</span>
                    Gestión de Tienda
                </h3>

                <div className="space-y-3 mb-6">
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm"
                            placeholder="Nombre del artículo"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                        />
                        <select
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold"
                            value={newItemCategory}
                            onChange={e => setNewItemCategory(e.target.value)}
                        >
                            <option value="other">Otro</option>
                            <option value="background">Fondo</option>
                            <option value="skin">Piel/Evolución</option>
                            <option value="hat">Sombrero</option>
                            <option value="lenses">Lentes</option>
                            <option value="crown">Corona</option>
                            <option value="cape">Capa</option>
                            <option value="nickname">Licencia Apodo</option>
                            <option value="travesura">Travesura (Mecánica)</option>
                            <option value="vfx">Efecto Especial (VFX)</option>
                            <option value="voucher">Vale (Cupón Real)</option>
                        </select>
                        <input
                            className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-center"
                            placeholder="Icon"
                            value={newItemIcon}
                            onChange={e => setNewItemIcon(e.target.value)}
                        />
                    </div>
                    <textarea
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm h-20 resize-none"
                        placeholder="Descripción"
                        value={newItemDesc}
                        onChange={e => setNewItemDesc(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3">
                            <span className="text-xs font-bold text-slate-400 mr-2">Costo:</span>
                            <input
                                type="number"
                                className="bg-transparent w-full p-3 text-sm font-bold"
                                value={newItemCost}
                                onChange={e => setNewItemCost(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-primary text-slate-900 font-black rounded-xl text-sm px-6 hover:scale-105 active:scale-95 transition-all"
                        >
                            {loading ? '...' : editingItem ? 'Actualizar' : 'Añadir'}
                        </button>
                        {editingItem && (
                            <button onClick={resetForm} className="bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl p-3">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {items.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-4 italic">No hay artículos en la tienda</p>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xl">{item.icon}</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{item.name}</p>
                                        <div className="flex gap-2">
                                            <p className="text-[10px] text-slate-400">{item.cost} pts</p>
                                            <p className="text-[10px] text-primary font-black uppercase">{item.category}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(item)} className="text-blue-400 hover:text-blue-500 p-1">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-500 p-1">
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShopManagement;
