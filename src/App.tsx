import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import FamilyManagement from './components/FamilyManagement'
import TasksDashboard from './components/TasksDashboard'
import CalendarView from './components/CalendarView'
import LoginView from './components/LoginView'
import RegisterView from './components/RegisterView'
import AvatarSelectionView from './components/AvatarSelectionView'
import ShopView from './components/ShopView'
import ShopManagement from './components/ShopManagement';
import VercelDeploy from './components/VercelDeploy';

type ViewState = 'tasks' | 'family' | 'calendar' | 'shop' | 'settings' | 'login' | 'register' | 'onboarding' | 'deploy';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplatePoints, setNewTemplatePoints] = useState('10');
  const [loading, setLoading] = useState(true);

  // Check for existing session (simulated via localStorage for this DNI system)
  useEffect(() => {
    const checkSession = async () => {
      const savedUser = localStorage.getItem('family_app_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        // Refresh user data from DB
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setCurrentUser(data);
          if (!data.onboarding_completed) {
            setCurrentView('onboarding');
          } else {
            setCurrentView('tasks');
          }
        }
      }
      setLoading(false);
    };

    const fetchTemplates = async () => {
      const { data } = await supabase.from('task_templates').select('*').order('created_at', { ascending: false });
      if (data) setTaskTemplates(data);
    };

    checkSession();
    fetchTemplates();
  }, []);

  const addTemplate = async () => {
    if (!newTemplateTitle.trim()) return;
    const { error } = await supabase.from('task_templates').insert([{
      title: newTemplateTitle,
      points: parseInt(newTemplatePoints) || 10
    }]);
    if (!error) {
      setNewTemplateTitle('');
      setNewTemplatePoints('10');
      const { data } = await supabase.from('task_templates').select('*').order('created_at', { ascending: false });
      if (data) setTaskTemplates(data);
    }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('task_templates').delete().eq('id', id);
    if (!error) {
      setTaskTemplates(taskTemplates.filter(t => t.id !== id));
    }
  };

  // Notification Logic (only for logged in users)
  useEffect(() => {
    if (!currentUser || currentView === 'login' || currentView === 'register') return;

    const checkDueTasks = async () => {
      const now = new Date();
      const targetTime = new Date(now.getTime() + 5 * 60000);
      const startOfMinute = new Date(targetTime.getFullYear(), targetTime.getMonth(), targetTime.getDate(), targetTime.getHours(), targetTime.getMinutes(), 0).toISOString();
      const endOfMinute = new Date(targetTime.getFullYear(), targetTime.getMonth(), targetTime.getDate(), targetTime.getHours(), targetTime.getMinutes(), 59, 999).toISOString();

      const { data: dueTasks } = await supabase
        .from('tasks')
        .select('title, reminder_active, due_date')
        .gte('due_date', startOfMinute)
        .lte('due_date', endOfMinute)
        .eq('is_completed', false);

      if (dueTasks && dueTasks.length > 0) {
        dueTasks.forEach(task => {
          if (task.reminder_active) {
            const dueTime = new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            alert(`🔔 Recordatorio: La tarea "${task.title}" vence en 5 minutos (${dueTime})`);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
          }
        });
      }
    };

    const interval = setInterval(checkDueTasks, 30000);
    return () => clearInterval(interval);
  }, [currentUser, currentView]);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('family_app_user', JSON.stringify(user));
    if (!user.onboarding_completed) {
      setCurrentView('onboarding');
    } else {
      setCurrentView('tasks');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('family_app_user');
    setCurrentUser(null);
    setCurrentView('login');
  };

  const renderView = () => {
    if (loading) {
      console.log('App is in loading state, checking currentUser...');
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark text-primary p-8 text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
          <h1 className="text-2xl font-black mb-2 animate-pulse">Cargando App Familiar...</h1>
          <p className="text-sm text-slate-500 font-bold opacity-60">Conectando con la base de datos segura</p>
          {/* Fallback button if stuck */}
          <button
            onClick={() => window.location.reload()}
            className="mt-8 text-xs font-black uppercase tracking-widest text-primary/50 hover:text-primary transition-colors"
          >
            ¿Tarda mucho? Reintentar
          </button>
        </div>
      );
    }

    if (!currentUser) {
      if (currentView === 'register') return <RegisterView onRegisterSuccess={handleLoginSuccess} onSwitchToLogin={() => setCurrentView('login')} />;
      return <LoginView onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setCurrentView('register')} />;
    }

    // Onboarding Bypass and Name Confirmation for Admin
    if (currentUser?.dni === '75777950' && (!currentUser.onboarding_completed || currentUser.name !== 'Ferybert')) {
      // Automatically set name to Ferybert and complete onboarding for admin if not done
      const updatedUser = {
        ...currentUser,
        name: 'Ferybert',
        onboarding_completed: true,
        avatar_url: 'admin_shield'
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('family_app_user', JSON.stringify(updatedUser));
      // Update DB too
      supabase.from('users').update({
        name: 'Ferybert',
        onboarding_completed: true,
        avatar_url: 'admin_shield'
      }).eq('id', currentUser.id).then();
    }

    if (!currentUser.onboarding_completed || currentView === 'onboarding') {
      return (
        <AvatarSelectionView
          uid={currentUser.id}
          onComplete={(avatar) => {
            const updatedUser = { ...currentUser, avatar_url: avatar, onboarding_completed: true };
            setCurrentUser(updatedUser);
            localStorage.setItem('family_app_user', JSON.stringify(updatedUser));
            setCurrentView('tasks');
          }}
        />
      );
    }

    switch (currentView) {
      case 'tasks':
        return <TasksDashboard currentUser={currentUser} />;
      case 'family':
        return <FamilyManagement currentUser={currentUser} />;
      case 'calendar':
        return <CalendarView currentUser={currentUser} onBack={() => setCurrentView('tasks')} />;
      case 'shop':
        return <ShopView currentUser={currentUser} />;
      case 'settings':
        // Admin can access deployment panel
        {
          currentUser?.dni === '75777950' && (
            <button
              onClick={() => setCurrentView('deploy')}
              className="mt-2 px-4 py-2 bg-purple-600 text-white rounded"
            >
              Deploy to Vercel
            </button>
          )
        }
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark text-slate-500 p-8">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary mb-6 flex items-center justify-center bg-slate-50 dark:bg-slate-900 shadow-xl">
              {currentUser.dni === '75777950' ? (
                <span className="material-symbols-outlined text-primary text-5xl">shield</span>
              ) : (
                <img src={currentUser.avatar_url} className="w-full h-full object-cover" />
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">{currentUser.name}</h2>
            <p className="text-sm border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">DNI: {currentUser.dni}</p>

            {currentUser.dni === '75777950' && (
              <div className="w-full max-w-sm space-y-4 mb-8">
                <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">list_alt</span>
                    Gestión de Tareas Rápidas
                  </h3>

                  <div className="space-y-3 mb-6">
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm"
                      placeholder="Nombre de la sugerencia"
                      value={newTemplateTitle}
                      onChange={e => setNewTemplateTitle(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold"
                        value={newTemplatePoints}
                        onChange={e => setNewTemplatePoints(e.target.value)}
                      />
                      <button
                        onClick={addTemplate}
                        className="flex-1 bg-primary text-slate-900 font-bold rounded-xl text-sm"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {taskTemplates.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-4 italic">No hay sugerencias guardadas</p>
                    ) : (
                      taskTemplates.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{t.title}</p>
                            <p className="text-[10px] text-slate-400">{t.points} pts</p>
                          </div>
                          <button onClick={() => deleteTemplate(t.id)} className="text-red-400 hover:text-red-500 p-1">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Shop Management Section */}
                <ShopManagement />

                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
                  <span className="text-sm font-bold">Modo Supervisor Activo</span>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full max-w-xs bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">logout</span>
              Cerrar Sesión
            </button>
          </div>
        );
      case 'deploy':
        return <VercelDeploy />;
      default:
        return <TasksDashboard currentUser={currentUser} />;
    }
  };

  const navItemClass = (view: ViewState) =>
    `flex flex-col items-center gap-1 transition-colors ${currentView === view ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`;

  // Hide Nav if not logged in or in onboarding
  const showNav = currentUser && currentUser.onboarding_completed && currentView !== 'onboarding' && currentView !== 'login' && currentView !== 'register';

  return (
    <div className="relative min-h-screen bg-background-light dark:bg-background-dark">
      {/* View Content */}
      <div className={`${showNav && currentView !== 'settings' ? 'pb-24' : ''}`}>
        {renderView()}
      </div>

      {/* Navigation Bar (Shared and Persistent) */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-8 pt-3 px-8 flex justify-between items-center z-40">
          <button onClick={() => setCurrentView('tasks')} className={navItemClass('tasks')}>
            <span className="material-symbols-outlined text-[24px]">checklist</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">Tareas</span>
          </button>
          <button onClick={() => setCurrentView('calendar')} className={navItemClass('calendar')}>
            <span className="material-symbols-outlined text-[24px] font-variation-settings-fill-1">event_note</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">Agenda</span>
          </button>
          <button onClick={() => setCurrentView('family')} className={navItemClass('family')}>
            <span className="material-symbols-outlined text-[24px]">groups</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">Familia</span>
          </button>
          <button onClick={() => setCurrentView('shop')} className={navItemClass('shop')}>
            <span className="material-symbols-outlined text-[24px]">storefront</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">Bazar</span>
          </button>
          <button onClick={() => setCurrentView('settings')} className={navItemClass('settings')}>
            <span className="material-symbols-outlined text-[24px]">
              {currentUser?.dni === '75777950' ? 'shield' : 'person'}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest">{currentUser?.dni === '75777950' ? 'Admin' : 'Perfil'}</span>
          </button>
        </nav>
      )}
    </div>
  )
}

export default App
