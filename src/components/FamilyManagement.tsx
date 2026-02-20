import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PetAvatar from './PetAvatar';

interface Member {
    id: string;
    name: string;
    role: string;
    avatar_url: string;
    total_points: number;
    streak_count: number;
    shield_hp: number;
    is_admin: boolean;
}

interface FamilyGoal {
    id: string;
    title: string;
    target_points: number;
    current_points: number;
    emoji: string;
    is_active: boolean;
    is_redeemed: boolean;
    status: string;
}

const AVATAR_OPTIONS = [
    "https://img.icons8.com/fluency/96/lion.png",
    "https://img.icons8.com/fluency/96/bear.png",
    "https://img.icons8.com/fluency/96/cat.png",
    "https://img.icons8.com/fluency/96/dog.png",
    "https://img.icons8.com/fluency/96/rabbit.png",
    "https://img.icons8.com/fluency/96/panda.png",
    "https://img.icons8.com/fluency/96/fox.png",
    "https://img.icons8.com/fluency/96/koala.png",
    "https://img.icons8.com/fluency/96/snake.png"
];

const EMOJI_OPTIONS = ['🏆', '🍕', '🎮', '✈️', '🏖️', '🎢', '🚲', '🎁', '📱', '👕', '🍔', '🍦'];

interface FamilyManagementProps {
    currentUser: any;
}

const FamilyManagement: React.FC<FamilyManagementProps> = ({ currentUser }) => {
    const [members, setMembers] = useState<Member[]>([]);
    const [goals, setGoals] = useState<FamilyGoal[]>([]);
    const [activeGoal, setActiveGoal] = useState<FamilyGoal | null>(null);
    const [loading, setLoading] = useState(true);

    // Member Form
    const [newMemberName, setNewMemberName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

    // Goal Form
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [newGoalPoints, setNewGoalPoints] = useState('500');
    const [newGoalEmoji, setNewGoalEmoji] = useState('🏆');

    // Point Adjustment
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [newPointValue, setNewPointValue] = useState<string>('');

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('family_admin_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'family_goals' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);

        const { data: membersData } = await supabase
            .from('family_members')
            .select('id, name, role, avatar_url, total_points, is_admin, streak_count, shield_hp, hidden_until, double_points_until, active_vfx')
            .order('total_points', { ascending: false });

        if (membersData) {
            setMembers(membersData as Member[]);
        }

        const { data: goalsData } = await supabase
            .from('family_goals')
            .select('*')
            .order('created_at', { ascending: false });

        if (goalsData) {
            setGoals(goalsData);
            const active = goalsData.find(g => g.is_active);
            setActiveGoal(active || null);
        }

        setLoading(false);
    };

    const isAdmin = currentUser?.dni === '75777950' || currentUser?.is_admin;

    const addMember = async () => {
        if (!newMemberName.trim()) return;

        const { error } = await supabase
            .from('family_members')
            .insert([{ name: newMemberName, role: 'Miembro', avatar_url: selectedAvatar, total_points: 0, is_admin: false }]);

        if (error) console.error('Error adding member:', error);
        else {
            fetchData();
            setNewMemberName('');
            setSelectedAvatar(AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)]);
        }
    };


    const removeMember = async (id: string) => {
        const confirmDelete = window.confirm('¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer');
        if (!confirmDelete) return;

        try {
            // 1. Delete tasks assigned to this member
            const { error: taskError } = await supabase
                .from('tasks')
                .delete()
                .eq('assignee_id', id);

            if (taskError) console.error('Error deleting member tasks:', taskError);

            // 2. Get the member details to find associated user (by name/avatar as heuristic if no ID link)
            const { data: memberData } = await supabase
                .from('family_members')
                .select('name, avatar_url')
                .eq('id', id)
                .single();

            // 3. Delete from users table if applicable
            if (memberData) {
                const { error: userError } = await supabase
                    .from('users')
                    .delete()
                    .eq('name', memberData.name)
                    .eq('avatar_url', memberData.avatar_url);

                if (userError) console.error('Error deleting associated user:', userError);
            }

            // 4. Delete from family_members
            const { error: memberError } = await supabase
                .from('family_members')
                .delete()
                .eq('id', id);

            if (memberError) console.error('Error deleting member:', memberError);
            else fetchData();
        } catch (err) {
            console.error('Unexpected error during member deletion:', err);
        }
    };

    const addGoal = async () => {
        if (!newGoalTitle.trim()) return;

        const { error } = await supabase
            .from('family_goals')
            .insert([{
                title: newGoalTitle,
                target_points: parseInt(newGoalPoints) || 500,
                current_points: 0,
                emoji: newGoalEmoji,
                is_active: goals.length === 0,
                status: 'pending'
            }]);

        if (error) console.error('Error adding goal:', error);
        else {
            fetchData();
            closeGoalModal();
        }
    };

    const deleteGoal = async (goalId: string) => {
        const confirmDelete = window.confirm('¿Estás seguro de que deseas eliminar esta meta?');
        if (!confirmDelete) return;

        const { error } = await supabase
            .from('family_goals')
            .delete()
            .eq('id', goalId);

        if (error) console.error('Error deleting goal:', error);
        else fetchData();
    };

    const activateGoal = async (goalId: string) => {
        const { error } = await supabase.rpc('set_active_goal', { goal_id: goalId });
        if (error) console.error('Error activating goal:', error);
        else fetchData();
    };

    const redeemGoal = async (goalId: string) => {
        const { error } = await supabase
            .from('family_goals')
            .update({ is_redeemed: true, status: 'redeemed' })
            .eq('id', goalId);

        if (error) console.error('Error redeeming goal:', error);
        else fetchData();
    };

    const adjustPoints = async () => {
        if (!editingMember) return;
        const points = parseInt(newPointValue);
        if (isNaN(points)) return;

        const { error } = await supabase
            .from('family_members')
            .update({ total_points: points })
            .eq('id', editingMember.id);

        if (error) console.error('Error adjusting points:', error);
        else {
            fetchData();
            setEditingMember(null);
        }
    };

    const closeGoalModal = () => {
        setShowGoalModal(false);
        setNewGoalTitle('');
        setNewGoalPoints('500');
        setNewGoalEmoji('🏆');
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-primary/10">
                <div className="flex items-center gap-2">
                    <PetAvatar
                        member={members.find(m => m.id === currentUser?.id) || currentUser}
                        size="sm"
                    />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate max-w-[120px]">{currentUser?.name || 'Usuario'}</span>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowGoalModal(true)}
                                    className="p-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all"
                                    title="Nueva Meta"
                                >
                                    <span className="material-symbols-outlined text-sm">add_circle</span>
                                </button>
                            )}
                        </div>
                        <span className={`text-[8px] font-black uppercase px-1 rounded border w-fit ${isAdmin ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {isAdmin ? 'Admin' : 'Miembro'}
                        </span>
                    </div>
                </div>

                <h1 className="text-lg font-bold tracking-tight absolute left-1/2 -translate-x-1/2">Familia y Metas</h1>
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-6 space-y-8 pb-24">

                {/* Active Goal Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Meta Activa</h2>
                    </div>

                    {activeGoal ? (
                        <div className={`bg-gradient-to-br ${activeGoal.current_points >= activeGoal.target_points ? 'from-green-500 to-emerald-600' : 'from-indigo-500 to-purple-600'} rounded-3xl p-6 text-white shadow-lg relative overflow-hidden transition-all hover:shadow-xl hover:scale-[1.01]`}>
                            <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12">
                                <span className="text-9xl">{activeGoal.emoji || '🏆'}</span>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">Prioridad</span>
                                    {activeGoal.current_points >= activeGoal.target_points && (
                                        <span className="bg-yellow-400 text-yellow-900 border border-yellow-300 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider animate-bounce">¡Completada!</span>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={() => deleteGoal(activeGoal.id)}
                                            className="ml-auto bg-white/10 hover:bg-red-500/20 text-white p-1 rounded-lg transition-colors"
                                            title="Eliminar Meta"
                                        >
                                            <span className="material-symbols-outlined text-sm text-red-100">delete</span>
                                        </button>
                                    )}
                                </div>

                                <h2 className="text-3xl font-black mb-1 flex items-center gap-2">
                                    <span>{activeGoal.emoji}</span>
                                    <span>{activeGoal.title}</span>
                                </h2>

                                <div className="flex items-end gap-2 mb-3 mt-4">
                                    <span className="text-5xl font-black">{activeGoal.current_points}</span>
                                    <span className="text-lg opacity-80 mb-2 font-medium">/ {activeGoal.target_points} pts</span>
                                </div>

                                <div className="w-full bg-black/20 rounded-full h-4 mb-3 overflow-hidden backdrop-blur-sm shadow-inner">
                                    <div
                                        className="bg-yellow-400 h-full rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_20px_rgba(250,204,21,0.6)]"
                                        style={{ width: `${Math.min(100, (activeGoal.current_points / activeGoal.target_points) * 100)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-xs opacity-90 font-medium">
                                        {activeGoal.current_points >= activeGoal.target_points ? '¡Meta alcanzada!' : `${activeGoal.target_points - activeGoal.current_points} puntos para canjear`}
                                    </p>

                                    {isAdmin && activeGoal.current_points >= activeGoal.target_points && !activeGoal.is_redeemed && (
                                        <button
                                            onClick={() => redeemGoal(activeGoal.id)}
                                            className="bg-white text-emerald-600 font-black px-4 py-2 rounded-xl text-xs shadow-lg hover:scale-105 transition-transform flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            Validar Entrega
                                        </button>
                                    )}

                                    {activeGoal.is_redeemed && (
                                        <span className="bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-bold">✓ Entregado</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div onClick={() => setShowGoalModal(true)} className="bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">add_circle</span>
                            <p className="font-bold">¡Crea tu primera meta familiar!</p>
                        </div>
                    )}
                </section>

                {/* Other Goals List */}
                {goals.length > 1 && (
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 ml-1">Otras Metas</h2>
                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x">
                            {goals.filter(g => !g.is_active).map(goal => (
                                <div key={goal.id} className={`snap-start shrink-0 w-48 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between ${goal.is_redeemed ? 'bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-800'}`}>
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <div className="text-3xl mb-2">{goal.emoji}</div>
                                            <div className="flex items-center gap-1">
                                                {goal.is_redeemed && <span className="text-emerald-500 material-symbols-outlined text-sm">verified</span>}
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => deleteGoal(goal.id)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                        title="Eliminar Meta"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className={`font-bold leading-tight line-clamp-2 mb-1 ${goal.is_redeemed ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>{goal.title}</h3>
                                        <p className="text-xs text-slate-500">{goal.current_points} / {goal.target_points} pts</p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                        {!goal.is_redeemed ? (
                                            <button
                                                onClick={() => activateGoal(goal.id)}
                                                className="w-full text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-white dark:hover:bg-primary py-2 rounded-lg transition-colors text-slate-600 dark:text-slate-300"
                                            >
                                                Activar Prioridad
                                            </button>
                                        ) : (
                                            <span className="w-full block text-center text-[10px] font-bold text-slate-400 uppercase">Completada</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Leaderboard Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tabla de Líderes</h2>
                    </div>

                    {loading ? (
                        <p className="text-center text-slate-400 py-8">Cargando puntuaciones...</p>
                    ) : (
                        <div className="space-y-3">
                            {members.map((member, index) => (
                                <div key={member.id} className="relative group bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-600' :
                                        index === 1 ? 'bg-slate-100 text-slate-600' :
                                            index === 2 ? 'bg-orange-100 text-orange-600' :
                                                'bg-slate-50 text-slate-400'
                                        }`}>
                                        {index + 1}
                                    </div>

                                    <div className="w-12 h-12 relative">
                                        <PetAvatar member={member} size="sm" isInteractive={false} />
                                        {index === 0 && <span className="absolute -top-2 -right-2 text-xl">👑</span>}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-900 dark:text-slate-100">{member.name}</p>
                                            {member.is_admin && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded font-bold">Admin</span>}
                                            {member.streak_count >= 3 && (
                                                <div className="flex items-center gap-0.5 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                                                    <span className="text-[10px]">🔥</span>
                                                    <span className="text-[10px] font-black text-orange-600 dark:text-orange-400">{member.streak_count}</span>
                                                </div>
                                            )}
                                            {member.shield_hp > 0 && (
                                                <div className="flex items-center gap-0.5 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                                                    <span className="text-[10px]">🛡️</span>
                                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{member.shield_hp}</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">{member.role}</p>
                                    </div>

                                    <div
                                        className={`flex flex-col items-end transition-all ${isAdmin ? 'cursor-pointer hover:bg-primary/10 p-1 rounded-lg' : ''}`}
                                        onClick={() => {
                                            if (isAdmin) {
                                                setEditingMember(member);
                                                setNewPointValue(member.total_points.toString());
                                            }
                                        }}
                                    >
                                        <span className={`text-xl font-black ${isAdmin ? 'text-primary' : 'text-slate-900 dark:text-slate-100'}`}>{member.total_points}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Puntos</span>
                                    </div>

                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeMember(member.id);
                                            }}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-lg ml-2"
                                            title="Eliminar Miembro"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Add Member Section (Admin Only) */}
                {isAdmin && (
                    <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">Añadir Miembro (Admin)</h2>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nombre</label>
                                <input
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-4 focus:ring-2 focus:ring-primary text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium"
                                    placeholder="Ej. Carlos"
                                    type="text"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Avatar</label>
                                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                    {AVATAR_OPTIONS.map((avatar, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setSelectedAvatar(avatar)}
                                            className={`flex-shrink-0 w-14 h-14 rounded-full border-4 cursor-pointer overflow-hidden transition-all ${selectedAvatar === avatar ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-transparent opacity-60 hover:opacity-100 hover:border-primary/50'}`}
                                        >
                                            <img className="w-full h-full object-cover" src={avatar} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={addMember}
                                disabled={!newMemberName.trim()}
                                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                            >
                                <span className="material-symbols-outlined">person_add</span>
                                Añadir a la Familia
                            </button>
                        </div>
                    </section>
                )}
            </main>

            {/* Goal Modal */}
            {showGoalModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h2 className="text-lg font-bold">Nueva Meta Familiar</h2>
                            <button onClick={closeGoalModal} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-slate-500">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Premio</label>
                                <input
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium"
                                    placeholder="Ej. Viaje a la playa"
                                    value={newGoalTitle}
                                    onChange={e => setNewGoalTitle(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Puntos Necesarios</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold"
                                    value={newGoalPoints}
                                    onChange={e => setNewGoalPoints(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Icono</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {EMOJI_OPTIONS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => setNewGoalEmoji(emoji)}
                                            className={`text-2xl p-2 rounded-xl transition-all ${newGoalEmoji === emoji ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={addGoal}
                                disabled={!newGoalTitle.trim()}
                                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-slate-900 font-bold py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4"
                            >
                                <span className="material-symbols-outlined">flag</span>
                                Crear Meta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Point Adjustment Modal */}
            {editingMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">edit</span>
                            Ajustar Puntos
                        </h2>
                        <p className="text-sm text-slate-500 mb-6">Ajustando puntos para <span className="font-bold text-slate-900 dark:text-slate-100">{editingMember.name}</span></p>

                        <input
                            type="number"
                            value={newPointValue}
                            onChange={e => setNewPointValue(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center text-3xl font-black focus:ring-2 focus:ring-primary outline-none transition-all"
                            autoFocus
                        />

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingMember(null)}
                                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={adjustPoints}
                                className="flex-1 py-3 text-sm font-bold bg-primary text-slate-900 rounded-xl shadow-lg shadow-primary/20 transition-transform active:scale-95"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyManagement;
