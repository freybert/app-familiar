import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import PetAvatar from './PetAvatar';
import PetDetailsModal from './PetDetailsModal';

interface Member {
    id: string;
    name: string;
    avatar_url: string;
    total_points: number;
    streak_count: number;
    shield_hp: number;
    last_streak_update?: string;
    pet_name?: string;
    selected_background?: string;
    selected_skin?: string;
    hidden_until?: string;
    double_points_until?: string;
    inventory?: any[];
}

interface Task {
    id: number;
    created_at: string;
    title: string;
    description?: string;
    due_date?: string;
    end_date?: string;
    duration?: string;
    assignee_id?: string;
    is_completed: boolean;
    is_daily: boolean;
    last_reset_date?: string;
    reminder_active?: boolean;
    points: number;
    family_members?: Member; // Joined data
    tipo_mision?: 'obligatoria' | 'opcional';
    evidencia_url?: string;
    fecha_completada?: string;
    robada?: boolean;
}

interface TasksDashboardProps {
    currentUser: any;
}

const TasksDashboard: React.FC<TasksDashboardProps> = ({ currentUser }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [penaltyAlerts, setPenaltyAlerts] = useState<{ name: string, points: number, title: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedMemberForPet, setSelectedMemberForPet] = useState<Member | null>(null);

    const isAdmin = currentUser?.dni === '75777950' || currentUser?.is_admin;

    // Form State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [newTaskEndDate, setNewTaskEndDate] = useState('');
    const [newTaskDuration, setNewTaskDuration] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState<string>(isAdmin ? '' : currentUser?.id || '');
    const [newTaskReminder, setNewTaskReminder] = useState(false);
    const [newTaskDaily, setNewTaskDaily] = useState(false);
    const [newTaskPoints, setNewTaskPoints] = useState('10');
    const [streakAlertShown, setStreakAlertShown] = useState(false);
    const [newTaskTipo, setNewTaskTipo] = useState<'obligatoria' | 'opcional'>('obligatoria');
    const [uploadingTaskId, setUploadingTaskId] = useState<number | null>(null);

    useEffect(() => {
        fetchData();

        // 8:00 PM Streak Alert Logic
        const streakInterval = setInterval(() => {
            const now = new Date();
            if (now.getHours() === 20 && now.getMinutes() === 0 && !streakAlertShown) {
                const userMember = members.find(m => m.id === currentUser?.id);
                if (userMember && userMember.streak_count > 0) {
                    const hasPendingDaily = tasks.some(t => t.is_daily && t.assignee_id === currentUser.id && !t.is_completed);
                    if (hasPendingDaily) {
                        alert(`¡Cuidado! Estás a punto de perder tu racha de 🔥 ${userMember.streak_count} días. ¡Completa tus tareas diarias!`);
                        setStreakAlertShown(true);
                    }
                }
            } else if (now.getHours() !== 20) {
                setStreakAlertShown(false);
            }
        }, 60000); // Check every minute

        return () => clearInterval(streakInterval);
    }, [currentUser, tasks, members, streakAlertShown]);

    const fetchData = async () => {
        setLoading(true);
        // Fetch Members
        const { data: membersData } = await supabase
            .from('family_members')
            .select('id, name, avatar_url, total_points, streak_count, shield_hp, last_streak_update, pet_name, selected_background, selected_skin, hidden_until, double_points_until');

        if (membersData) setMembers(membersData as Member[]);

        // Fetch Templates
        const { data: templatesData } = await supabase
            .from('task_templates')
            .select('*')
            .order('created_at', { ascending: false });
        if (templatesData) setTemplates(templatesData);

        // Fetch Tasks with Assignee details
        const { data: tasksData, error } = await supabase
            .from('tasks')
            .select(`
                *,
                family_members (
                    id,
                    name,
                    avatar_url,
                    pet_name,
                    selected_background,
                    selected_skin
                )
            `)
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching tasks:', error);
        else {
            setTasks(tasksData || []);
            const now = new Date();
            const newAlerts: { name: string, points: number, title: string }[] = [];
            const todayStr = new Date().toISOString().split('T')[0];

            for (const task of (tasksData || [])) {
                if (task.due_date && !task.is_completed && !task.penalty_applied && !task.is_daily) {
                    const dueDate = new Date(task.due_date);
                    if (dueDate < now) {
                        const penalty = (task.points || 10) * 2;
                        await applyPenalty(task.id, task.assignee_id, penalty);
                        newAlerts.push({ name: task.family_members?.name || 'Alguien', points: penalty, title: task.title });
                    }
                }

                if (task.is_daily && task.last_reset_date !== todayStr) {
                    if (!task.is_completed) {
                        const penalty = (task.points || 10) * 2;
                        await applyPenalty(task.id, task.assignee_id, penalty);
                        newAlerts.push({
                            name: task.family_members?.name || 'Alguien',
                            points: penalty,
                            title: `${task.title} (Incumplimiento Diario)`
                        });
                    }
                    await supabase.from('tasks')
                        .update({
                            is_completed: false,
                            last_reset_date: todayStr,
                            penalty_applied: false
                        })
                        .eq('id', task.id);
                }
            }
            if (newAlerts.length > 0) {
                setPenaltyAlerts(prev => [...prev, ...newAlerts]);
            }

            const memberStreakMap = new Map<string, { allDailyDone: boolean, hasDaily: boolean }>();
            for (const task of (tasksData || [])) {
                if (task.is_daily && task.assignee_id) {
                    if (!memberStreakMap.has(task.assignee_id)) {
                        memberStreakMap.set(task.assignee_id, { allDailyDone: true, hasDaily: true });
                    }
                    const state = memberStreakMap.get(task.assignee_id)!;
                    if (task.last_reset_date !== todayStr && !task.is_completed) {
                        state.allDailyDone = false;
                    }
                }
            }

            for (const [memberId, state] of memberStreakMap.entries()) {
                const member = (membersData || []).find(m => m.id === memberId);
                if (member && member.last_streak_update !== todayStr) {
                    let newStreak = member.streak_count || 0;
                    let newShieldHP = member.shield_hp || 0;
                    if (state.allDailyDone) {
                        newStreak += 1;
                    } else {
                        if (newShieldHP > 0) {
                            newShieldHP -= 1;
                        } else {
                            newStreak = 0;
                        }
                    }
                    await supabase.from('family_members')
                        .update({
                            streak_count: newStreak,
                            shield_hp: newShieldHP,
                            last_streak_update: todayStr
                        })
                        .eq('id', memberId);
                }
            }
            const { data: updatedMembers } = await supabase.from('family_members').select('id, name, avatar_url, total_points, streak_count, shield_hp, last_streak_update, pet_name, selected_background, selected_skin, hidden_until, double_points_until, active_vfx');
            if (updatedMembers) setMembers(updatedMembers as Member[]);
        }
        setLoading(false);
    };

    const handleUseJoker = async (task: Task) => {
        if (task.assignee_id !== currentUser.id && !isAdmin) return;

        // 1. Check for Joker in inventory
        const { data: joker } = await supabase
            .from('user_items')
            .select('id, shop_items!inner(name)')
            .eq('user_id', currentUser.id)
            .ilike('shop_items.name', '%Comodín%')
            .limit(1)
            .single();

        if (!joker) {
            alert('❌ No tienes Comodines en tu inventario. ¡Cómpralos en el Bazar!');
            return;
        }

        if (window.confirm('¿Quieres usar 1 Comodín para perdonar esta tarea? No ganarás puntos, pero no habrá penalización.')) {
            // 2. Consume Joker (Delete single instance row)
            await supabase.from('user_items').delete().eq('id', joker.id);

            // 3. Mark task as completed (forgiven)
            await supabase.from('tasks').update({ is_completed: true }).eq('id', task.id);

            alert('🃏 ¡Tarea perdonada con éxito!');
            fetchData();
        }
    };

    const applyPenalty = async (taskId: number, assigneeId: string, penalty: number) => {
        try {
            await supabase.from('tasks').update({ penalty_applied: true }).eq('id', taskId);
            if (assigneeId) {
                const { data: member } = await supabase.from('family_members').select('total_points').eq('id', assigneeId).single();
                if (member) {
                    await supabase.from('family_members').update({ total_points: (member.total_points || 0) - penalty }).eq('id', assigneeId);
                }
            }
        } catch (err) {
            console.error('Error applying penalty:', err);
        }
    };

    const handleRobarTarea = async (task: Task) => {
        if (!window.confirm(`¿Quieres robar la tarea "${task.title}"?`)) return;

        try {
            const { error } = await supabase.from('tasks').update({
                assignee_id: currentUser.id,
                robada: true
            }).eq('id', task.id);

            if (error) throw error;

            setTasks(tasks.map(t => t.id === task.id ? { ...t, assignee_id: currentUser.id, robada: true } : t));
            alert('¡Tarea robada con éxito! Ahora es tuya.');
            fetchData();
        } catch (err: any) {
            console.error('Error al robar tarea:', err);
            alert('Error al robar tarea.');
        }
    };

    const addTask = async () => {
        if (!newTaskTitle.trim()) return;
        if (!newTaskAssignee) {
            alert('Por favor, selecciona un miembro de la familia para asignar la tarea.');
            return;
        }
        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                title: newTaskTitle,
                description: newTaskDesc,
                due_date: newTaskDate ? new Date(newTaskDate).toISOString() : null,
                end_date: newTaskEndDate ? new Date(newTaskEndDate).toISOString() : (newTaskDate ? new Date(newTaskDate).toISOString() : null),
                duration: newTaskDuration || null,
                assignee_id: newTaskAssignee || null,
                is_completed: false,
                is_daily: newTaskDaily,
                last_reset_date: newTaskDaily ? new Date().toISOString().split('T')[0] : null,
                reminder_active: newTaskReminder,
                points: parseInt(newTaskPoints) || 10,
                tipo_mision: newTaskTipo
            }])
            .select(`
                *,
                family_members (
                    id,
                    name,
                    avatar_url,
                    pet_name,
                    selected_background,
                    selected_skin
                )
            `);

        if (error) console.error('Error adding task:', error);
        else {
            if (data) setTasks([data[0], ...tasks]);
            closeModal();
        }
    };

    const handleUploadAndComplete = async (e: React.ChangeEvent<HTMLInputElement>, task: Task) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingTaskId(task.id);

            // Subir la foto al bucket "evidencias" en Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${task.id}-${Date.now()}.${fileExt}`;
            const filePath = `${currentUser.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('evidencias')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Obtener la URL pública de la imagen
            const { data: publicUrlData } = supabase.storage
                .from('evidencias')
                .getPublicUrl(filePath);

            const evidenciaUrl = publicUrlData.publicUrl;
            const fechaCompletada = new Date().toISOString();

            // Lógica de puntos
            const member = members.find(m => m.id === task.assignee_id);
            const hasActiveStreak = member && (member.streak_count || 0) >= 3;
            const pointsChange = hasActiveStreak ? (task.points || 10) * 2 : (task.points || 10);
            const finalPoints = task.robada ? pointsChange * 2 : pointsChange;

            // Update user points and mark task as completed
            const { error: taskError } = await supabase.from('tasks').update({
                is_completed: true,
                evidencia_url: evidenciaUrl,
                fecha_completada: fechaCompletada
            }).eq('id', task.id);

            if (taskError) throw taskError;

            setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: true, evidencia_url: evidenciaUrl, fecha_completada: fechaCompletada } : t));

            if (task.assignee_id) {
                const { data: memberData } = await supabase.from('family_members').select('total_points').eq('id', task.assignee_id).single();
                const newTotalPoints = (memberData?.total_points || 0) + finalPoints;
                await supabase.from('family_members').update({ total_points: newTotalPoints }).eq('id', task.assignee_id);
                setMembers(members.map(m => m.id === task.assignee_id ? { ...m, total_points: newTotalPoints } : m));
            }

            if (task.robada) {
                alert('¡Robo exitoso! Puntos x2. ¡Puntos ganados! Evidencia subida con éxito.');
            } else {
                alert('¡Puntos ganados! Evidencia subida con éxito.');
            }
        } catch (error: any) {
            console.error('Error uploading evidence:', error);
            alert('Error al subir la evidencia: ' + error.message);
        } finally {
            setUploadingTaskId(null);
            // Clear input
            e.target.value = '';
        }
    };

    const toggleTask = async (task: Task) => {
        const isCompleting = !task.is_completed;
        const member = members.find(m => m.id === task.assignee_id);
        const hasActiveStreak = member && (member.streak_count || 0) >= 3;
        const pointsChange = isCompleting
            ? (hasActiveStreak ? (task.points || 10) * 2 : (task.points || 10))
            : -(hasActiveStreak ? (task.points || 10) * 2 : (task.points || 10));

        const { error } = await supabase.from('tasks').update({ is_completed: isCompleting }).eq('id', task.id);
        if (error) throw error;

        setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: isCompleting } : t));
        if (task.assignee_id) {
            const { data: memberData } = await supabase.from('family_members').select('total_points').eq('id', task.assignee_id).single();
            const newTotalPoints = (memberData?.total_points || 0) + pointsChange;
            await supabase.from('family_members').update({ total_points: newTotalPoints }).eq('id', task.assignee_id);
            setMembers(members.map(m => m.id === task.assignee_id ? { ...m, total_points: newTotalPoints } : m));
        }
    };

    const deleteTask = async (id: number) => {
        const confirmDelete = window.confirm('¿Estás seguro de que deseas eliminar este elemento?');
        if (!confirmDelete) return;
        setTasks(tasks.filter(t => t.id !== id));
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) {
            console.error('Error deleting task:', error);
            fetchData();
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDate('');
        setNewTaskEndDate('');
        setNewTaskDuration('');
        setNewTaskAssignee(isAdmin ? '' : currentUser?.id || '');
        setNewTaskReminder(false);
        setNewTaskDaily(false);
        setNewTaskPoints('10');
        setNewTaskTipo('obligatoria');
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        const date = parseISO(dateString);
        if (isToday(date)) return `Hoy, ${format(date, 'HH:mm', { locale: es })}`;
        if (isTomorrow(date)) return `Mañana, ${format(date, 'HH:mm', { locale: es })}`;
        return format(date, 'd MMM, HH:mm', { locale: es });
    };

    const renderTaskCard = (task: Task) => {
        const isOpcional = task.tipo_mision === 'opcional';

        return (
            <div key={task.id} className={`group bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border-2 ${isOpcional ? 'border-yellow-400/50 dark:border-yellow-600/50' : 'border-red-400/50 dark:border-red-500/50'} transition-all ${task.is_completed ? 'opacity-60 grayscale-[0.5]' : 'hover:shadow-md hover:scale-[1.01]'}`}>
                <div className="flex items-start gap-3">
                    <div className="relative">
                        {uploadingTaskId === task.id ? (
                            <div className="mt-1 w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin flex items-center justify-center"></div>
                        ) : task.is_completed ? (
                            <button
                                onClick={() => toggleTask(task)}
                                className="mt-1 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors bg-primary border-primary text-white"
                                title="Desmarcar Tarea"
                            >
                                <span className="material-symbols-outlined text-sm font-bold">check</span>
                            </button>
                        ) : (
                            <label className="mt-1 w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-primary flex items-center justify-center cursor-pointer overflow-hidden transition-colors text-slate-400 hover:text-primary group/upload relative" title="Tomar Foto y Completar">
                                <span className="material-symbols-outlined text-sm font-bold">photo_camera</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    onChange={(e) => handleUploadAndComplete(e, task)}
                                />
                            </label>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 pr-10 relative">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {isOpcional ? (
                                <span className="text-yellow-500 material-symbols-outlined text-sm font-variation-settings-fill-1">star</span>
                            ) : (
                                <span className="text-red-500 material-symbols-outlined text-sm font-variation-settings-fill-1">priority_high</span>
                            )}
                            <h3 className={`font-bold text-slate-900 dark:text-slate-100 line-clamp-1 ${task.is_completed ? 'line-through opacity-50' : ''}`}>
                                {task.title}
                            </h3>
                            {task.is_daily && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm border border-blue-100 dark:border-blue-800 animate-pulse">
                                    <span className="material-symbols-outlined text-[12px]">sync</span>
                                    Diaria
                                </div>
                            )}
                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-[10px] font-bold border border-yellow-200 dark:border-yellow-700/50">
                                <span>🪙</span>
                                <span>{task.points}</span>
                            </div>
                        </div>
                        {task.description && <p className="text-sm text-slate-500 mb-2 line-clamp-1 italic">{task.description}</p>}

                        <div className="flex items-center gap-3">
                            {task.family_members && (
                                <div
                                    onClick={() => setSelectedMemberForPet(task.family_members as Member)}
                                    className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 pr-2 rounded-full border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                    <PetAvatar member={task.family_members as Member} size="sm" isInteractive={false} />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[80px]">{task.family_members.pet_name || task.family_members.name}</span>
                                        {(task.family_members as any).hidden_until && new Date((task.family_members as any).hidden_until) > new Date() && (
                                            <span className="text-[8px] font-black text-primary uppercase">🌫️ Oculto</span>
                                        )}
                                    </div>
                                </div>
                            )}
                            {task.due_date && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                                    <span className="material-symbols-outlined text-[14px]">event</span>
                                    {formatDate(task.due_date)}
                                </div>
                            )}

                            {/* Action: Robar (If assigned to someone else and not completed) */}
                            {!task.is_completed && task.assignee_id !== currentUser.id && (
                                <button
                                    onClick={() => handleRobarTarea(task)}
                                    className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-black hover:bg-red-500/20 transition-all uppercase"
                                >
                                    <span className="material-symbols-outlined text-[12px] font-variation-settings-fill-1">local_police</span>
                                    Robar Tarea
                                </button>
                            )}

                            {/* Forgive button if pending */}
                            {!task.is_completed && task.assignee_id === currentUser.id && !isOpcional && (
                                <button
                                    onClick={() => handleUseJoker(task)}
                                    className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-lg text-[9px] font-black hover:bg-purple-500/20 transition-all uppercase"
                                >
                                    🃏 Perdonar
                                </button>
                            )}
                        </div>

                        {/* Action: Delete (Admin only) */}
                        {isAdmin && (
                            <button
                                onClick={() => deleteTask(task.id)}
                                className="absolute top-0 right-0 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-lg font-variation-settings-fill-0">delete</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Mis Tareas</h1>
                    <p className="text-sm text-slate-500 font-medium">Tienes {tasks.filter(t => !t.is_completed).length} tareas pendientes</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setShowModal(true)}
                                className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all mr-2 flex items-center gap-1"
                                title="Nueva Tarea"
                            >
                                <span className="material-symbols-outlined text-lg">add_circle</span>
                                <span className="text-[10px] font-black uppercase">Tarea</span>
                            </button>
                            {(members.find(m => m.id === currentUser?.id)?.streak_count ?? 0) >= 3 && (
                                <div className="flex items-center bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800 animate-pulse">
                                    <span className="text-[12px]">🔥</span>
                                    <span className="text-[10px] font-black text-orange-600 dark:text-orange-400">
                                        {members.find(m => m.id === currentUser?.id)?.streak_count}
                                    </span>
                                </div>
                            )}
                            {(members.find(m => m.id === currentUser?.id)?.shield_hp ?? 0) > 0 && (
                                <div className="flex items-center bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                                    <span className="text-[10px]">🛡️</span>
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">
                                        {members.find(m => m.id === currentUser?.id)?.shield_hp}
                                    </span>
                                </div>
                            )}
                            {(members.find(m => m.id === currentUser?.id)?.double_points_until) && new Date(members.find(m => m.id === currentUser?.id)!.double_points_until!) > new Date() && (
                                <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-800 animate-pulse">
                                    <span className="text-[10px]">⚡</span>
                                    <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400">2x</span>
                                </div>
                            )}
                            {(members.find(m => m.id === currentUser?.id)?.hidden_until) && new Date(members.find(m => m.id === currentUser?.id)!.hidden_until!) > new Date() && (
                                <div className="flex items-center bg-slate-100 dark:bg-slate-900/30 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px]">🌫️</span>
                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">Oculto</span>
                                </div>
                            )}
                            <span className="text-sm font-bold truncate max-w-[120px]">{currentUser?.name || 'Usuario'}</span>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border w-fit leading-none ${isAdmin ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {isAdmin ? 'Admin' : 'Miembro'}
                        </span>
                    </div>
                    <PetAvatar
                        member={members.find(m => m.id === currentUser?.id) || currentUser}
                        size="md"
                        onClick={() => setSelectedMemberForPet(members.find(m => m.id === currentUser?.id) || currentUser)}
                    />
                </div>
            </header>

            {/* Task List */}
            <main className="flex-1 overflow-y-auto px-6 pb-24 space-y-6">
                {/* Penalty Alerts */}
                {penaltyAlerts.map((alert, i) => (
                    <div key={i} className="bg-red-500 text-white p-4 rounded-2xl shadow-lg border-2 border-red-600 animate-in slide-in-from-top duration-500 relative overflow-hidden group">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl animate-pulse">warning</span>
                            <div className="flex-1">
                                <p className="font-black uppercase tracking-wider text-xs opacity-80">¡Tarea incumplida!</p>
                                <p className="font-bold text-sm">
                                    <span className="underline decoration-white/30">{alert.name}</span> ha perdido <span className="text-yellow-300 font-extrabold">{alert.points} puntos</span> por no terminar: <span className="italic">"{alert.title}"</span>
                                </p>
                            </div>
                            <button onClick={() => setPenaltyAlerts(prev => prev.filter((_, idx) => idx !== i))} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    </div>
                ))}

                {loading ? (
                    <div className="text-center py-10 text-slate-400">Cargando tareas...</div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700 mb-4 block">task_alt</span>
                        <p className="text-slate-500 font-bold">¡Todo listo por ahora!</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined font-variation-settings-fill-1">warning</span>
                                Misiones Principales
                            </h2>
                            <div className="space-y-3">
                                {tasks.filter(t => !t.tipo_mision || t.tipo_mision === 'obligatoria').length === 0 ? (
                                    <p className="text-slate-400 text-sm italic">No hay misiones principales pendientes.</p>
                                ) : (
                                    tasks.filter(t => !t.tipo_mision || t.tipo_mision === 'obligatoria').map(renderTaskCard)
                                )}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-yellow-500 mb-4 flex items-center gap-2 mt-8">
                                <span className="material-symbols-outlined font-variation-settings-fill-1">star</span>
                                Misiones Secundarias
                            </h2>
                            <div className="space-y-3">
                                {tasks.filter(t => t.tipo_mision === 'opcional').length === 0 ? (
                                    <p className="text-slate-400 text-sm italic">No hay misiones secundarias disponibles.</p>
                                ) : (
                                    tasks.filter(t => t.tipo_mision === 'opcional').map(renderTaskCard)
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full sm:max-w-xl rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-black">Nueva Tarea</h2>
                            <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Título</label>
                                <input
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 rounded-3xl p-4 font-bold outline-none focus:border-primary transition-all"
                                    placeholder="¿Qué hay que hacer?"
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                />
                            </div>

                            {templates.length > 0 && (
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Plantillas</label>
                                    <div className="flex flex-wrap gap-2">
                                        {templates.map(tmp => (
                                            <button
                                                key={tmp.id}
                                                onClick={() => { setNewTaskTitle(tmp.title); setNewTaskPoints(tmp.points.toString()); }}
                                                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-primary/10 hover:text-primary rounded-2xl text-xs font-bold border border-slate-100 dark:border-slate-800 transition-all flex items-center gap-2"
                                            >
                                                {tmp.title} <span className="opacity-40 tracking-normal">🪙{tmp.points}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Descripción</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 rounded-3xl p-4 font-bold outline-none focus:border-primary transition-all resize-none h-24 text-sm"
                                    placeholder="Instrucciones o detalles..."
                                    value={newTaskDesc}
                                    onChange={e => setNewTaskDesc(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Fecha límite</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold outline-none focus:border-primary"
                                        value={newTaskDate}
                                        onChange={e => setNewTaskDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Valor recompensado</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 rounded-2xl p-4 font-black outline-none focus:border-primary text-primary"
                                        value={newTaskPoints}
                                        onChange={e => setNewTaskPoints(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800">
                                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-4 ml-1">Asignar a</label>
                                <div className="grid grid-cols-4 gap-4">
                                    {members.map(member => (
                                        <button
                                            key={member.id}
                                            onClick={() => setNewTaskAssignee(member.id)}
                                            className={`flex flex-col items-center gap-2 group transition-all ${newTaskAssignee === member.id ? 'scale-110' : 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-full border-4 transition-colors ${newTaskAssignee === member.id ? 'border-primary' : 'border-transparent'}`}>
                                                <PetAvatar member={member} size="sm" isInteractive={false} />
                                            </div>
                                            <span className="text-[10px] font-black text-center truncate w-full">{member.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-6 px-1">
                                <div onClick={() => setNewTaskDaily(!newTaskDaily)} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${newTaskDaily ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-200 dark:border-slate-700'}`}>
                                        {newTaskDaily && <span className="material-symbols-outlined text-sm font-black text-[16px]">check</span>}
                                    </div>
                                    <span className={`text-sm font-black ${newTaskDaily ? 'text-blue-500' : 'text-slate-400'}`}>TAREA DIARIA</span>
                                </div>
                                <div onClick={() => setNewTaskReminder(!newTaskReminder)} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${newTaskReminder ? 'bg-primary border-primary text-slate-900' : 'border-slate-200 dark:border-slate-700'}`}>
                                        {newTaskReminder && <span className="material-symbols-outlined text-sm font-black text-[16px]">check</span>}
                                    </div>
                                    <span className={`text-sm font-black ${newTaskReminder ? 'text-primary' : 'text-slate-400'}`}>RECORDATORIO</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800">
                                <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-4 ml-1">Tipo de Misión</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setNewTaskTipo('obligatoria')}
                                        className={`p-3 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${newTaskTipo === 'obligatoria' ? 'border-red-500 bg-red-500/10 text-red-600' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}
                                    >
                                        <span className="material-symbols-outlined font-variation-settings-fill-1 text-sm">warning</span>
                                        Obligatoria
                                    </button>
                                    <button
                                        onClick={() => setNewTaskTipo('opcional')}
                                        className={`p-3 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${newTaskTipo === 'opcional' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}
                                    >
                                        <span className="material-symbols-outlined font-variation-settings-fill-1 text-sm">star</span>
                                        Opcional
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-white dark:bg-slate-800 border-t border-slate-50 dark:border-slate-700">
                            <button
                                onClick={addTask}
                                disabled={!newTaskTitle.trim()}
                                className="w-full bg-primary text-slate-900 font-black py-5 rounded-[28px] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                            >
                                <span className="material-symbols-outlined font-black">add_task</span>
                                CREAR TAREA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pet Details Modal */}
            <PetDetailsModal
                isOpen={!!selectedMemberForPet}
                onClose={() => setSelectedMemberForPet(null)}
                member={selectedMemberForPet || currentUser}
                isOwnPet={selectedMemberForPet?.id === currentUser?.id}
                onShopClick={() => {
                    setSelectedMemberForPet(null);
                    alert("¡Ve al Bazar a comprar nuevos estilos!");
                }}
            />
        </div>
    );
};

export default TasksDashboard;
