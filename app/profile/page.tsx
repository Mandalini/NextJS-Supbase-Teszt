"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form adatok
    const [displayName, setDisplayName] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                router.push('/login');
                return;
            }

            setUser(user);
            setDisplayName(user.user_metadata?.display_name || '');
            setLoading(false);
        };

        fetchUser();
    }, [router]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // A metadata nevű rejtett mező frissítése a fiókban
        const { error } = await supabase.auth.updateUser({
            data: { display_name: displayName }
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
        return <div className="p-8 text-center text-gray-400">Profil betöltése...</div>;
    }

    return (
        <div className="min-h-screen p-8 max-w-2xl mx-auto flex flex-col justify-center">

            <div className="mb-8 flex justify-between items-center">
                <h1 className="text-4xl font-extrabold text-white tracking-wider glow-text"><span className="text-gray-200">PRO</span><span className="text-gold">FIL</span></h1>
                <Link href="/dashboard" className="px-5 py-2 glass-panel text-white hover:bg-white/10 rounded-lg transition-all glow-border">
                    Vissza a Vezérlőpultra
                </Link>
            </div>

            <div className="glass-panel p-8 rounded-2xl glow-border transition-all duration-300">
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#5b42ff] to-[#9d4edd] flex items-center justify-center text-3xl font-bold shadow-[0_0_20px_rgba(91,66,255,0.5)]">
                        {displayName ? displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{displayName || 'Névtelen Felhasználó'}</h2>
                        <p className="text-blue-300 tracking-wide text-sm">{user?.email}</p>
                    </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300 tracking-wider">Megjelenítendő név</label>
                        <input
                            type="text"
                            placeholder="Írd be a neved..."
                            className="w-full bg-black/40 border border-white/20 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                        <p className="text-xs text-gray-400 mt-2">Ez a név fog megjelenni a pubilkusan létrehozott eseményeid mellett is.</p>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black font-extrabold px-6 py-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,193,7,0.5)] transition-all duration-300 disabled:opacity-50"
                        >
                            {saving ? 'Mentés folyamatban...' : 'PROFIL FRISSÍTÉSE'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
