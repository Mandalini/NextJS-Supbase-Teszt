"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useTheme } from '@/lib/contexts/ThemeContext';
import ThemeSwitcher from '../components/ThemeSwitcher';

export default function ProfilePage() {
    const router = useRouter();
    const { theme, setTheme, saveThemeToProfile } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form adatok
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                router.push('/login');
                return;
            }

            setUser(user);
            setDisplayName(user.user_metadata?.display_name || '');
            setAvatarUrl(user.user_metadata?.avatar_url || '');
            setLoading(false);
        };

        fetchUser();
    }, [router]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        let finalAvatarUrl = avatarUrl;

        // Ha van új profilkép
        if (avatarFile) {
            const fileName = `${user.id}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, avatarFile, { upsert: true });

            if (uploadError) {
                console.error('Kép feltöltési hiba:', uploadError);
                alert('Hiba történt a profilkép feltöltésekor.');
                setSaving(false);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            finalAvatarUrl = publicUrlData.publicUrl;
            setAvatarUrl(finalAvatarUrl);
        }

        // Felhasználói profil metaadatainak frissítése
        const { error } = await supabase.auth.updateUser({
            data: {
                display_name: displayName,
                avatar_url: finalAvatarUrl,
                theme: theme // ThemeMentés egyben!
            }
        });

        setSaving(false);

        if (error) {
            console.error('Hiba történt a profil frissítésekor:', error);
            alert('Hiba történt a mentés során.');
        } else {
            alert('A profilod sikeresen frissült!');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-400 animate-pulse">Profil betöltése...</div>;
    }

    return (
        <div className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto flex flex-col justify-center">

            <div className="mb-6 flex justify-between items-center gap-4">
                <h1 className="text-3xl font-extrabold text-white tracking-wider glow-text"><span className="text-gray-200">PRO</span><span className="text-gold">FIL</span></h1>
                <Link href="/dashboard" className="px-5 py-2 glass-panel text-white hover:bg-white/10 rounded-lg transition-all glow-border text-xs uppercase tracking-widest font-bold">
                    Vissza
                </Link>
            </div>

            <div className="glass-panel p-6 rounded-3xl glow-border transition-all duration-300">
                <div className="flex items-center gap-5 mb-6 pb-6 border-b border-white/10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-blue to-brand-purple flex flex-shrink-0 items-center justify-center text-3xl font-bold shadow-[0_0_20px_var(--color-brand-blue)] overflow-hidden border-2 border-brand-purple/50 relative group">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
                        ) : (
                            displayName ? displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">{displayName || 'Névtelen Felhasználó'}</h2>
                        <p className="text-brand-blue font-mono text-sm tracking-widest">{user?.email}</p>
                    </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* Megjelenítendő Név */}
                    <div>
                        <label className="block text-xs font-bold mb-2 text-gold tracking-widest uppercase">Megjelenítendő név</label>
                        <input
                            type="text"
                            placeholder="Írd be a neved..."
                            className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors text-sm"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </div>

                    {/* Profilkép feltöltés */}
                    <div>
                        <label className="block text-xs font-bold mb-3 text-brand-purple tracking-widest uppercase">Új profilkép feltöltése</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                            className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:bg-brand-blue/20 file:text-brand-blue hover:file:bg-brand-blue/30 transition-all cursor-pointer"
                        />
                    </div>

                    {/* Téma / Skin Váltás */}
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                        <label className="block text-[10px] font-bold text-brand-blue tracking-widest uppercase flex items-center gap-2">
                            <span>🎨</span> Kedvenc Téma (Skin) beállítása
                        </label>
                        <ThemeSwitcher showName={true} />
                    </div>

                    <div className="pt-4 border-t border-white/10">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black font-extrabold px-6 py-3 rounded-xl hover:shadow-[0_0_20px_var(--color-gold)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 tracking-widest uppercase text-xs"
                        >
                            {saving ? 'Mentés folyamatban...' : 'Minden módosítás mentése'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
