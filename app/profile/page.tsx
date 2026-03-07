"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useTheme } from '@/lib/contexts/ThemeContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

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

    // Új publikus profil mezők
    const [phone, setPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [facebook, setFacebook] = useState('');
    const [instagram, setInstagram] = useState('');
    const [slogan, setSlogan] = useState('');
    const [introduction, setIntroduction] = useState('');
    const [isPublic, setIsPublic] = useState(false);

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

            // Profil kiegészítő adatok lekérdezése (adatbázisból)
            const { data: profile } = await supabase
                .from('profiles')
                .select('phone, website, facebook, instagram, slogan, introduction, is_public')
                .eq('id', user.id)
                .single();

            if (profile) {
                setPhone(profile.phone || '');
                setWebsite(profile.website || '');
                setFacebook(profile.facebook || '');
                setInstagram(profile.instagram || '');
                setSlogan(profile.slogan || '');
                setIntroduction(profile.introduction || '');
                setIsPublic(profile.is_public || false);
            }

            setLoading(false);
        };

        fetchUser();
    }, [router]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        let finalAvatarUrl = avatarUrl;

        // Ha van új profilkép - retry logikával a hálózati hibák kezelésére
        if (avatarFile) {
            const fileName = `${user.id}-${Date.now()}`;
            let uploadSuccess = false;
            let lastError: any = null;

            // Max 3 próbálkozás
            for (let attempt = 1; attempt <= 3; attempt++) {
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, avatarFile, { upsert: true });

                if (!uploadError) {
                    uploadSuccess = true;
                    break;
                }

                lastError = uploadError;
                console.warn(`Kép feltöltés ${attempt}. próba sikertelen:`, uploadError.message);

                if (attempt < 3) {
                    // Várjunk egy kicsit a következő próba előtt (exponent. backoff)
                    await new Promise(r => setTimeout(r, attempt * 500));
                }
            }

            if (!uploadSuccess) {
                console.error('Kép feltöltési hiba (3 próba után):', lastError);
                alert('Hiba történt a profilkép feltöltésekor. Kérjük próbáld újra!');
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
        const { error: authError } = await supabase.auth.updateUser({
            data: {
                display_name: displayName,
                avatar_url: finalAvatarUrl,
                theme: theme // ThemeMentés egyben!
            }
        });

        if (authError) {
            console.error('Hiba történt a profil frissítésekor:', authError);
            alert('Hiba történt a mentés során.');
            setSaving(false);
            return;
        }

        // Másodszor: Profil kiegészítő adatainak frissítése a `profiles` táblában
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                phone,
                website,
                facebook,
                instagram,
                slogan,
                introduction,
                is_public: isPublic
            })
            .eq('id', user.id);

        setSaving(false);

        if (profileError) {
            console.error("Hiba a profiles tábla frissítésekor:", profileError);
            alert('A profilod frissült, de a publikus adatok mentése sikertelen volt.');
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
                <Link href="/dashboard" className="px-5 py-2.5 glass-panel text-white hover:bg-white/10 rounded-xl transition-all glow-border text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
                    <span>&larr;</span> Vissza a Vezérlőpultra
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

                    {/* Publikus adatlap szekció */}
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-6 mt-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Publikus Profil Beállítások</h3>
                                <p className="text-sm text-gray-400">Ezek az adatok jelennek meg a szervezői (publikus) adatlapodon.</p>
                            </div>
                            <label className="flex items-center cursor-pointer">
                                <span className="mr-3 text-sm font-bold text-gold uppercase tracking-widest">{isPublic ? 'Publikus' : 'Privát'}</span>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                                    <div className={`block w-14 h-8 rounded-full transition-colors ${isPublic ? 'bg-gold' : 'bg-gray-600'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isPublic ? 'transform translate-x-6' : ''}`}></div>
                                </div>
                            </label>
                        </div>

                        <div className="space-y-6 transition-all duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold mb-2 text-gray-400 tracking-widest uppercase">Telefonszám</label>
                                    <input
                                        type="tel"
                                        placeholder="+36 30 123 4567"
                                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors text-sm"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-2 text-gray-400 tracking-widest uppercase">Weboldal</label>
                                    <input
                                        type="url"
                                        placeholder="https://szervezo-oldala.hu"
                                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors text-sm"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-2 text-gray-400 tracking-widest uppercase">Facebook URL</label>
                                    <input
                                        type="url"
                                        placeholder="https://facebook.com/..."
                                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors text-sm"
                                        value={facebook}
                                        onChange={(e) => setFacebook(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-2 text-gray-400 tracking-widest uppercase">Instagram URL</label>
                                    <input
                                        type="url"
                                        placeholder="https://instagram.com/..."
                                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors text-sm"
                                        value={instagram}
                                        onChange={(e) => setInstagram(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-2 text-gray-400 tracking-widest uppercase">Mottó / Szlogen</label>
                                <input
                                    type="text"
                                    placeholder="Rövid, egy mondatos bemutatkozó..."
                                    className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors text-sm"
                                    value={slogan}
                                    onChange={(e) => setSlogan(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-2 text-gray-400 tracking-widest uppercase">Részletes Bemutatkozás</label>
                                <div className="bg-black/40 border border-white/20 rounded-xl overflow-hidden [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-white/20 [&_.ql-toolbar]:bg-white/5 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-white [&_.ql-editor]:text-sm [&_.ql-stroke]:stroke-gray-300 [&_.ql-fill]:fill-gray-300 [&_.ql-picker]:text-gray-300">
                                    <ReactQuill
                                        theme="snow"
                                        value={introduction}
                                        onChange={setIntroduction}
                                        placeholder="Írd le ide a részletes beiratkozásodat..."
                                    />
                                </div>
                            </div>
                        </div>
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
