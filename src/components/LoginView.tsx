import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LoginViewProps {
    onLoginSuccess: (user: any) => void;
    onSwitchToRegister: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Numbers only
        if (value.length <= 8) {
            setDni(value);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (dni.length !== 8) {
            setError('El DNI debe tener 8 dígitos');
            return;
        }
        if (!password) {
            setError('Ingresa tu contraseña');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data, error: supabaseError } = await supabase
                .from('users')
                .select('*')
                .eq('dni', dni)
                .eq('password', password)
                .single();

            if (supabaseError || !data) {
                setError('DNI o contraseña incorrectos');
            } else {
                onLoginSuccess(data);
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4 font-display">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden p-8 border border-slate-100 dark:border-slate-700">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-primary">lock</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Bienvenido de nuevo</h1>
                    <p className="text-slate-500 dark:text-slate-400">Ingresa tus credenciales militares</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">DNI (Perú)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={dni}
                            onChange={handleDniChange}
                            placeholder="Ej. 12345678"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-lg"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">error</span>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-slate-900 font-bold py-4 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? 'Validando...' : (
                            <>
                                <span className="material-symbols-outlined">login</span>
                                Entrar a la app
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={onSwitchToRegister}
                        className="text-sm font-bold text-primary hover:underline"
                    >
                        ¿No tienes cuenta? Regístrate aquí
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
