import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

interface CalendarViewProps {
    onBack: () => void;
    currentUser: any;
}

interface Task {
    id: number;
    title: string;
    description?: string;
    due_date: string;
    end_date?: string;
    is_completed: boolean;
    is_daily: boolean;
    duration?: string;
    reminder_active?: boolean;
    family_members?: {
        avatar_url: string;
    } | { avatar_url: string }[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ onBack, currentUser }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const isAdmin = currentUser?.dni === '75777950' || currentUser?.is_admin;

    useEffect(() => {
        fetchTasks();

        // Realtime Subscription
        const channel = supabase
            .channel('tasks_calendar_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks'
                },
                (payload) => {
                    console.log('Realtime change received:', payload);
                    fetchTasks(); // Helper to refetch on any change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentMonth]);

    const fetchTasks = async () => {
        setLoading(true);
        console.log('Fetching tasks for calendar...');

        const { data, error } = await supabase
            .from('tasks')
            .select(`
                id,
                title,
                description,
                due_date,
                end_date,
                is_completed,
                duration,
                reminder_active,
                family_members (
                    avatar_url
                )
            `)
            .or('is_completed.eq.false,is_daily.eq.true');

        if (error) {
            console.error('Error fetching calendar tasks:', error);
        } else {
            setTasks((data as any) || []);
        }
        setLoading(false);
    };

    const getTasksForDate = (date: Date) => {
        return tasks.filter(task => {
            if (task.is_daily) return true;
            if (!task.due_date) return false;

            const start = startOfDay(new Date(task.due_date));
            const end = task.end_date ? endOfDay(new Date(task.end_date)) : endOfDay(new Date(task.due_date));
            const checkDate = startOfDay(date);

            return isWithinInterval(checkDate, { start, end });
        });
    };

    const getAvatarUrl = (members: Task['family_members']) => {
        if (Array.isArray(members)) {
            return members[0]?.avatar_url;
        }
        return members?.avatar_url;
    };

    const startDate = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const endDate = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const selectedTasks = getTasksForDate(selectedDate);

    const toggleReminder = async (taskId: number, currentStatus: boolean) => {
        // Optimistic update
        const updatedTasks = tasks.map(t =>
            t.id === taskId ? { ...t, reminder_active: !currentStatus } : t
        );
        setTasks(updatedTasks);

        const { error } = await supabase
            .from('tasks')
            .update({ reminder_active: !currentStatus })
            .eq('id', taskId);

        if (error) {
            console.error('Error updating reminder:', error);
            fetchTasks(); // Revert
        }
    };

    const deleteTask = async (taskId: number) => {
        const confirmDelete = window.confirm('¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer');
        if (!confirmDelete) return;

        // Optimistic update
        setTasks(tasks.filter(t => t.id !== taskId));

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting task:', error);
            fetchTasks(); // Revert
        }
    };

    // Helper for rendering the bar
    const getTaskStyle = (task: Task, date: Date, isSelected: boolean) => {
        const start = startOfDay(new Date(task.due_date));
        const end = task.end_date ? endOfDay(new Date(task.end_date)) : endOfDay(new Date(task.due_date));
        const current = startOfDay(date);

        const isStart = isSameDay(current, start);
        const isEnd = isSameDay(current, end);
        const isMultiDay = !isSameDay(start, end);

        if (!isMultiDay) {
            return isSelected
                ? 'bg-white/20 text-white rounded px-1'
                : 'bg-primary/10 text-primary-dark dark:text-primary-light rounded px-1';
        }

        // Multi-day styles
        let style = 'text-white px-1 text-[8px] truncate ';
        if (isStart) style += 'bg-indigo-500 rounded-l-md ml-1 mr-[-5px] z-10';
        else if (isEnd) style += 'bg-indigo-500 rounded-r-md mr-1 ml-[-5px] z-10';
        else style += 'bg-indigo-500 rounded-none mx-[-5px] z-0';

        return style;
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display animate-in fade-in duration-300">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-primary/10">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-primary/10 rounded-full transition-colors"
                >
                    <span className="material-symbols-outlined text-slate-900 dark:text-slate-100">arrow_back_ios_new</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight">Calendario</h1>
                <div className="w-8"></div>
            </header>

            {/* Calendar Controls */}
            <div className="flex items-center justify-between px-6 py-4">
                <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h2 className="text-xl font-bold capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h2>
                <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 px-2 mb-2">
                {weekDays.map((day) => (
                    <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 px-2">
                {days.map((day) => {
                    const dayTasks = getTasksForDate(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => {
                                setSelectedDate(day);
                                setIsModalOpen(true);
                            }}
                            className={`
                                aspect-[3/4] rounded-xl flex flex-col pt-1.5 cursor-pointer transition-all border relative overflow-hidden
                                ${!isSameMonth(day, currentMonth) ? 'opacity-30 bg-transparent border-transparent' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'}
                                ${isSelected ? '!bg-primary !text-white !border-primary shadow-lg shadow-primary/30 z-20' : ''}
                                ${isToday && !isSelected ? 'border-primary/50 border-2' : ''}
                            `}
                        >
                            <span className={`text-xs font-bold mb-1 text-center ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                {format(day, 'd')}
                            </span>

                            {/* Task Content in Grid */}
                            <div className="w-full flex flex-col gap-0.5">
                                {dayTasks.slice(0, 3).map((task, i) => (
                                    <div key={i} className={`text-[8px] truncate py-0.5 ${getTaskStyle(task, day, isSelected)}`}>
                                        {task.title}
                                    </div>
                                ))}
                                {dayTasks.length > 3 && (
                                    <div className={`text-[8px] font-bold text-center ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                        +{dayTasks.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Day Detail Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                            <div>
                                <h2 className="text-lg font-bold capitalize text-slate-900 dark:text-slate-100">
                                    {isSameDay(selectedDate, new Date()) ? 'Para Hoy' : format(selectedDate, 'EEEE, d MMMM', { locale: es })}
                                </h2>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{selectedTasks.length} Tareas</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors bg-slate-100 dark:bg-slate-800">
                                <span className="material-symbols-outlined text-slate-500">close</span>
                            </button>
                        </div>

                        {/* Tasks List */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {loading ? (
                                <p className="text-center text-slate-400 py-8">Cargando...</p>
                            ) : selectedTasks.length > 0 ? (
                                selectedTasks.map(task => {
                                    // Calculate Display Time Block
                                    const startDate = new Date(task.due_date);
                                    const endDate = task.end_date ? new Date(task.end_date) : startDate;
                                    const isMultiDay = !isSameDay(startDate, endDate);

                                    const timeBlock = isMultiDay
                                        ? `${format(startDate, 'd MMM')} - ${format(endDate, 'd MMM')}`
                                        : `${format(startDate, 'HH:mm')} - ${task.duration || 'Flexible'}`;

                                    return (
                                        <div key={task.id} className="group flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3 w-full">
                                                    <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-700 rounded-xl p-2 min-w-[3.5rem] border border-slate-100 dark:border-slate-600 self-start">
                                                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">
                                                            {format(startDate, 'HH:mm')}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">Inicia</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg line-clamp-2">{task.title}</h4>

                                                        {/* Visual Time Block */}
                                                        <div className="flex items-center gap-2 text-xs text-primary font-bold mt-0.5 mb-1">
                                                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                            <span>{timeBlock}</span>
                                                        </div>

                                                        {/* Description */}
                                                        {task.description && (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mt-1">
                                                                {task.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Reminder Toggle */}
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleReminder(task.id, task.reminder_active || false);
                                                        }}
                                                        className={`flex-shrink-0 p-2 rounded-full transition-all ${task.reminder_active ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-slate-300'}`}
                                                        title="Alternar Recordatorio"
                                                    >
                                                        <span className={`material-symbols-outlined ${task.reminder_active ? 'filled' : ''}`}>notifications</span>
                                                    </button>

                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteTask(task.id);
                                                            }}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                                                            title="Eliminar Tarea"
                                                        >
                                                            <span className="material-symbols-outlined">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="h-px bg-slate-200 dark:bg-slate-700 w-full" />

                                            {/* Assignee & Actions */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getAvatarUrl(task.family_members) ? (
                                                        <>
                                                            <img src={getAvatarUrl(task.family_members)} className="w-6 h-6 rounded-full bg-white p-0.5 shadow-sm" alt="Assignee" />
                                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Asignado</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-400 italic">Sin asignar</span>
                                                    )}
                                                </div>

                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${task.is_completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {task.is_completed ? 'Completada' : 'Pendiente'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                                        <span className="material-symbols-outlined text-4xl opacity-50">event_available</span>
                                    </div>
                                    <p className="text-base font-medium">No hay tareas para este día</p>
                                    <p className="text-sm opacity-60 text-center max-w-[200px]">¡Toca el botón + en la pantalla principal para añadir una!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarView;
