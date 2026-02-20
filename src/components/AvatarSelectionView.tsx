import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AvatarSelectionViewProps {
    uid: string;
    onComplete: (avatarUrl: string) => void;
}

const AVATAR_OPTIONS = [
    { name: 'León', url: "https://img.icons8.com/fluency/96/lion.png" },
    { name: 'Oso', url: "https://img.icons8.com/fluency/96/bear.png" },
    { name: 'Gato', url: "https://img.icons8.com/fluency/96/cat.png" },
    { name: 'Perro', url: "https://img.icons8.com/fluency/96/dog.png" },
    { name: 'Conejo', url: "https://img.icons8.com/fluency/96/rabbit.png" },
    { name: 'Panda', url: "https://img.icons8.com/fluency/96/panda.png" },
    { name: 'Zorro', url: "https://img.icons8.com/fluency/96/fox.png" },
    { name: 'Koala', url: "https://img.icons8.com/fluency/96/koala.png" },
    { name: 'Serpiente', url: "https://img.icons8.com/fluency/96/snake.png" }
];

const AvatarSelectionView: React.FC<AvatarSelectionViewProps> = ({ uid, onComplete }) => {
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!selectedAvatar) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    avatar_url: selectedAvatar,
                    onboarding_completed: true
                })
                .eq('id', uid);

            if (!error) {
                // Automatically create an entry in family_members
                // We fetch the user's name first
                const { data: userData } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', uid)
                    .single();

                if (userData) {
                    await supabase
                        .from('family_members')
                        .insert([{
                            id: uid,
                            name: userData.name,
                            role: 'Miembro',
                            avatar_url: selectedAvatar,
                            total_points: 0,
                            is_admin: false
                        }]);
                }

                onComplete(selectedAvatar);
            }
        } catch (err) {
            console.error('Error saving avatar:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6 font-display">
            <div className="w-full max-w-xl text-center mb-12">
                <span className="inline-block bg-primary/10 text-primary text-xs font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full mb-4">Paso Final</span>
                <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-4">¡Elige tu Avatar!</h1>
                <p className="text-slate-500 dark:text-slate-400">Selecciona el animalito que te representará en la familia</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-2xl px-4">
                {AVATAR_OPTIONS.map((avatar) => (
                    <button
                        key={avatar.url}
                        onClick={() => setSelectedAvatar(avatar.url)}
                        className={`group relative flex flex-col items-center p-4 rounded-3xl border-4 transition-all duration-300 ${selectedAvatar === avatar.url ? 'border-primary bg-primary/5 scale-105 shadow-2xl shadow-primary/20' : 'border-transparent bg-white dark:bg-slate-800 hover:border-primary/30 hover:scale-105'}`}
                    >
                        <div className="w-20 h-20 mb-3 relative">
                            <img src={avatar.url} alt={avatar.name} className="w-full h-full object-contain" />
                            {selectedAvatar === avatar.url && (
                                <div className="absolute -top-2 -right-2 bg-primary text-slate-900 w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
                                    <span className="material-symbols-outlined text-[16px] font-black">check</span>
                                </div>
                            )}
                        </div>
                        <span className={`text-sm font-bold ${selectedAvatar === avatar.url ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>
                            {avatar.name}
                        </span>
                    </button>
                ))}
            </div>

            <div className="mt-16 w-full max-w-md">
                <button
                    onClick={handleConfirm}
                    disabled={!selectedAvatar || loading}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-slate-900 font-bold py-5 rounded-3xl shadow-2xl shadow-primary/40 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                >
                    <span className="text-lg">¡Estoy listo para comenzar!</span>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
            </div>
        </div>
    );
};

export default AvatarSelectionView;
