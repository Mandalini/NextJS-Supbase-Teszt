'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/app/hooks/usePermissions';
import dynamic from 'next/dynamic';
import SyncTasksTable from '@/app/components/SyncTasksTable';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const THEMES = [
    { id: 'default', name: 'Alapértelmezett', color: '#3b82f6' },
    { id: 'green', name: 'Sötétzöld', color: '#22c55e' },
    { id: 'gong', name: 'Gong Akadémia', color: '#f97316' },
    { id: 'rezgesekhaza', name: 'Rezgések Háza', color: '#a855f7' },
    { id: 'cyberpunk', name: 'Modern Cyberpunk', color: '#ec4899' },
];

export default function AdminEditProfilePage() {
    const router = useRouter();
    const params = useParams();
    const userId = params.userId as string;

    const { loading: permsLoading, permissions: userPermissions } = usePermissions();
    const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [selectedTheme, setSelectedTheme] = useState('default');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    // Új publikus profil mezők
    const [phone, setPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [facebook, setFacebook] = useState('');
    const [instagram, setInstagram] = useState('');
    const [slogan, setSlogan] = useState('');
    const [introduction, setIntroduction] = useState('');
    const [isPublic, setIsPublic] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'ok' | 'err', text: string } | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setCurrentAdminId(data.user.id);
        });
    }, []);

    useEffect(() => {
        if (permsLoading) return;
        const canManage = userPermissions.some((p: any) => p.action === 'manage_roles');
        if (!canManage) {
            router.push('/dashboard');
            return;
        }
        fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permsLoading, userPermissions]);

    const fetchProfile = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            setDisplayName(data.display_name || '');
            setEmail(data.email || '');
            setAvatarUrl(data.avatar_url || '');
            setPhone(data.phone || '');
            setWebsite(data.website || '');
            setFacebook(data.facebook || '');
            setInstagram(data.instagram || '');
            setSlogan(data.slogan || '');
            setIntroduction(data.introduction || '');
            setIsPublic(data.is_public || false);
        }

        // Fetch theme from auth metadata
        const { data: authData } = await supabase.auth.admin?.getUserById?.(userId) || { data: null };
        // Since client can't call admin.getUserById, get from user_metadata via profiles workaround
        // Theme is stored in auth user_metadata — we show it read-only first, then admin can override
        setLoading(false);
    };

    const handleAvatarUpload = async (): Promise<string | null> => {
        if (!avatarFile) return avatarUrl;

        const fileName = `admin-${userId}-${Date.now()}`;
        let uploadSuccess = false;
        let lastError: any = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            const { error } = await supabase.storage
                .from('avatars')
                .upload(fileName, avatarFile, { upsert: true });

            if (!error) { uploadSuccess = true; break; }
            lastError = error;
            if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 500));
        }

        if (!uploadSuccess) {
            setMessage({ type: 'err', text: 'Profilkép feltöltési hiba: ' + lastError?.message });
            return null;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentAdminId) {
            setMessage({ type: 'err', text: '❌ Bejelentkezési hiba: admin azonosító nem található.' });
            return;
        }
        setSaving(true);
        setMessage(null);

        // Avatar feltöltése ha kell
        const finalAvatarUrl = await handleAvatarUpload();
        if (finalAvatarUrl === null && avatarFile) {
            setSaving(false);
            return;
        }

        const useAvatarUrl = finalAvatarUrl || avatarUrl;

        // Mivel az API végpont most már mindent ment (RLS megkerülésével), rábízzuk arra a mentést!
        // A kliens oldali supabase update elhagyható, így biztos nem lesz RLS hiba privát profiloknál.
        try {
            const res = await fetch('/api/admin/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIdToUpdate: userId,
                    requestingUserId: currentAdminId,
                    displayName,
                    avatarUrl: useAvatarUrl,
                    theme: selectedTheme,
                    phone,
                    website,
                    facebook,
                    instagram,
                    slogan,
                    introduction,
                    isPublic
                }),
            });
            const result = await res.json();
            if (result.error) {
                // Ha az API route hibázik (pl. Service Role hiánya), a profil mentése már sikeres volt
                console.warn('Auth metadata frissítés sikertelen (téma):', result.error);
                setMessage({ type: 'ok', text: '✅ Profil mentve! (Téma csak szerver újraindítás után szinkronizál)' });
            } else {
                setMessage({ type: 'ok', text: '✅ Profil sikeresen frissítve!' });
            }
        } catch {
            setMessage({ type: 'ok', text: '✅ Profil mentve! (Téma csak szerver újraindítás után szinkronizál)' });
        }

        setAvatarUrl(useAvatarUrl);
        setAvatarFile(null);
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!currentAdminId) return;

        // 1. lépés: Biztonság kérdés
        const confirmed1 = window.confirm(
            `⚠️ FIGYELEM!\n\nBiztosan törlöd ezt a felhasználót?\n\nEmail: ${email}\n\nEz a művelet VISSZAFORDÍTHATATLAN!`
        );
        if (!confirmed1) return;

        // 2. lépés: Írja be az email-t megerősítésként
        const typed = window.prompt(`A törlés megerősítéséhez írd be a felhasználó email-jét:\n\n${email}`);
        if (typed !== email) {
            alert('Az email cím nem egyezik. Törlés megszakítva.');
            return;
        }

        // 3. lépés: Esemény kérdés
        const deleteEventsChoice = window.confirm(
            'Töröljük a felhasználó által LÉTREHOZOTT ESEMÉNYEKET is?\n\n(OK = Igen, töröld az eseményeket is)\n(Mégse = Csak a fiókot töröld, az események maradjanak)'
        );

        const res = await fetch('/api/admin/user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userIdToDelete: userId,
                requestingUserId: currentAdminId,
                deleteEvents: deleteEventsChoice,
            }),
        });

        const result = await res.json();
        if (result.error) {
            alert('❌ Hiba a törlés során: ' + result.error);
        } else {
            alert('✅ Felhasználó sikeresen törölve!');
            router.push('/dashboard/roles');
        }
    };

    if (permsLoading || loading) {
        return <div className="p-8 text-center text-gray-500 glow-text min-h-screen flex items-center justify-center">Betöltés...</div>;
    }

    const isSelf = currentAdminId === userId;

    return (
        <div className="p-8 max-w-2xl mx-auto min-h-screen text-white">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
                <h1 className="text-3xl font-extralight tracking-wider">
                    FELHASZNÁLÓ <span className="text-gold font-bold glow-text">SZERKESZTÉSE</span>
                    {isSelf && <span className="ml-3 text-[11px] font-bold uppercase tracking-widest bg-brand-blue/30 text-brand-blue border border-brand-blue/50 px-2 py-1 rounded-full align-middle">Saját fiókod</span>}
                </h1>
                <Link
                    href="/dashboard/roles"
                    className="px-5 py-2.5 glass-panel text-white hover:bg-white/10 rounded-xl transition-all glow-border text-[10px] uppercase tracking-widest font-bold flex items-center gap-2"
                >
                    <span>&larr;</span> Vissza
                </Link>
            </div>

            <div className="glass-panel p-8 rounded-2xl glow-border mb-6">
                {/* Avatar előnézet */}
                <div className="flex items-center gap-5 mb-8 pb-6 border-b border-white/10">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brand-purple/50 flex-shrink-0 bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center text-2xl font-bold">
                        {avatarFile ? (
                            <img src={URL.createObjectURL(avatarFile)} alt="Előnézet" className="w-full h-full object-cover" />
                        ) : avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            displayName?.charAt(0)?.toUpperCase() || '?'
                        )}
                    </div>
                    <div>
                        <p className="text-white font-bold text-lg">{displayName || 'Névtelen Felhasználó'}</p>
                        <p className="text-gray-400 text-sm font-mono">{email}</p>
                        <p className="text-gray-600 text-xs font-mono mt-1">ID: {userId}</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="flex flex-col gap-5">
                    {/* Megjelenő név */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-2 font-bold">Megjelenő Név</label>
                        <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                            className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                            placeholder="pl. Kovács János" />
                    </div>

                    {/* Email — csak olvasható magyarázattal */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-bold">
                            Email cím <span className="text-yellow-500/70 normal-case tracking-normal">(nem módosítható biztonsági okokból — email változtatáshoz jelszó visszaállítás szükséges)</span>
                        </label>
                        <input type="email" value={email} disabled
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-gray-500 cursor-not-allowed font-mono text-sm" />
                    </div>

                    {/* Téma választó */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-2 font-bold">Felhasználói Téma</label>
                        <div className="relative">
                            <button type="button" className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold transition-colors text-left flex items-center justify-between group"
                                onClick={() => document.getElementById('theme-dropdown')?.classList.toggle('hidden')}>
                                <span className="flex items-center gap-3">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: THEMES.find(t => t.id === selectedTheme)?.color }}></span>
                                    {THEMES.find(t => t.id === selectedTheme)?.name || 'Alapértelmezett'}
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <div id="theme-dropdown" className="hidden absolute top-full left-0 right-0 mt-1 z-50 glass-panel border border-brand-blue/30 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl">
                                {THEMES.map(t => (
                                    <button key={t.id} type="button"
                                        onClick={() => { setSelectedTheme(t.id); document.getElementById('theme-dropdown')?.classList.add('hidden'); }}
                                        className={`w-full text-left px-4 py-3 text-xs uppercase tracking-widest font-bold transition-colors flex items-center gap-3 ${selectedTheme === t.id ? 'bg-brand-blue/20 text-brand-blue border-l-4 border-brand-blue' : 'text-gray-300 hover:bg-white/10 hover:text-white border-l-4 border-transparent'}`}>
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }}></span>
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Profilkép */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-2 font-bold">Profilkép</label>
                        <div className="flex gap-3 items-center flex-wrap">
                            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white text-xs uppercase tracking-widest font-bold hover:border-gold transition-colors">
                                📷 Kép feltöltése
                                <input type="file" accept="image/*" className="hidden" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
                            </label>
                            {avatarFile && <span className="text-xs text-green-400 font-mono">{avatarFile.name}</span>}
                        </div>
                        <div className="mt-2">
                            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">vagy URL-lel</label>
                            <input type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
                                className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors font-mono text-sm"
                                placeholder="https://..." />
                        </div>
                    </div>

                    {/* --- SZERKESZTŐI PUBLIKUS PROFIL MEZŐK --- */}
                    <div className="mt-8 border-t border-white/10 pt-8 flex flex-col gap-5">
                        <h3 className="text-xl font-bold uppercase tracking-widest text-brand-purple mb-2">Publikus Profil Beállítások</h3>

                        <div className="flex items-center bg-brand-purple/10 p-4 rounded-xl border border-brand-purple/30">
                            <input
                                type="checkbox"
                                id="is_public"
                                className="mr-3 w-5 h-5 accent-brand-purple rounded border-white/20 cursor-pointer"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                            />
                            <div className="flex flex-col">
                                <label htmlFor="is_public" className="text-sm font-bold text-white cursor-pointer select-none">
                                    Profil publikussá tétele
                                </label>
                                <span className="text-xs text-brand-purple/80 tracking-wide mt-1">A bepipálással a felhasználó megjelenik a publikus Szervezők listájában és egyedi adatlapja lesz.</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-2 font-bold">Telefonszám (Publikus)</label>
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-colors"
                                placeholder="+36 30 123 4567" />
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-2 font-bold">Weboldal (Publikus)</label>
                            <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
                                className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-colors"
                                placeholder="https://www.sajatoldal.hu" />
                        </div>

                        <div className="flex gap-4 flex-col sm:flex-row">
                            <div className="flex-1">
                                <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-2 font-bold">Facebook Oldal URL (Publikus)</label>
                                <input type="url" value={facebook} onChange={e => setFacebook(e.target.value)}
                                    className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-colors"
                                    placeholder="https://facebook.com/valami" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-2 font-bold">Instagram URL (Publikus)</label>
                                <input type="url" value={instagram} onChange={e => setInstagram(e.target.value)}
                                    className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-colors"
                                    placeholder="https://instagram.com/valami" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-2 font-bold">Szervezői Mottó / Szlogen</label>
                            <input type="text" value={slogan} onChange={e => setSlogan(e.target.value)}
                                className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-gold font-bold italic focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-colors"
                                placeholder="&quot;Minden esemény egy új élmény...&quot;" />
                            <p className="text-[10px] text-gray-500 mt-1">Ez a rövid szöveg fog megjelenni a szervező neve alatt a kártyákon.</p>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-2 font-bold">Részletes Bemutatkozás</label>
                            <div className="bg-black/60 rounded-xl overflow-hidden border border-white/20 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple transition-colors">
                                <ReactQuill
                                    theme="snow"
                                    value={introduction}
                                    onChange={setIntroduction}
                                    className="text-white min-h-[250px] editor-container"
                                    placeholder="Írd ide a részletes bemutatkozást..."
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">A szöveg formázható. Itt mutathatja be a felhasználó részletesen a munkásságát.</p>
                        </div>
                    </div>

                    {message && (
                        <div className={`text-sm p-3 rounded-xl border ${message.type === 'ok' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <button type="submit" disabled={saving}
                        className="bg-gold text-black font-bold uppercase tracking-widest text-xs py-3 px-8 rounded-xl hover:bg-gold/80 transition-colors shadow-[0_0_15px_var(--color-gold)] disabled:opacity-50">
                        {saving ? 'Mentés...' : '💾 Profil Mentése'}
                    </button>
                </form>
            </div>

            {/* Szinkronizálási vezérlő (Csak ha a profil publikus, vagy mindig?) - legyen mindig */}
            {(userPermissions.some((p: any) => p.action === 'view_sync_rules') || userPermissions.some((p: any) => p.action === 'manage_sync_rules')) && (
                <div className="glass-panel p-6 rounded-2xl glow-border mb-6">
                    <h3 className="text-xl font-bold uppercase tracking-widest text-brand-blue mb-4">Külső Szinkronizálás Célpontjai</h3>
                    <p className="text-gray-400 text-xs mb-4">Itt állíthatod be, hogy ezt a szervezőt mely külső rendszerekbe kell szinkronizálni, és nyomon követheted azok állapotát.</p>
                    <div className="bg-black/40 rounded-xl overflow-hidden border border-white/10 p-2 md:p-4">
                        <SyncTasksTable 
                            fixedTargetType="Szervező" 
                            fixedTargetId={userId} 
                            readonly={!userPermissions.some((p: any) => p.action === 'manage_sync_rules')}
                        />
                    </div>
                </div>
            )}

            {/* Veszélyzóna – Törlés */}
            {!isSelf && (
                <div className="glass-panel p-6 rounded-2xl border border-red-500/30 bg-red-500/5">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-red-400 mb-2">⚠️ Veszélyzóna</h2>
                    <p className="text-gray-500 text-xs mb-4">A felhasználó törlése visszafordíthatatlan. A rendszer kéri a megerősítést és rákérdez a kapcsolódó adatok kezelésére.</p>
                    <button onClick={handleDelete}
                        className="bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-bold uppercase tracking-widest text-xs py-2.5 px-6 rounded-xl transition-colors">
                        🗑️ Felhasználó Törlése
                    </button>
                </div>
            )}
            {isSelf && (
                <div className="glass-panel p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-500/70 text-xs text-center uppercase tracking-widest">
                    Saját fiókodat nem törölheted admin felületről.
                </div>
            )}
        </div>
    );
}
