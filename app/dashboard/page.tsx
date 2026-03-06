"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Szűrési állapotok
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Nézet állapota ('grid' vagy 'table')
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Inicializáljuk a nézetet a localStorage-ból, ha van
    useEffect(() => {
        const savedView = localStorage.getItem('eventViewMode');
        if (savedView === 'grid' || savedView === 'table') {
            setViewMode(savedView);
        }
    }, []);

    const changeViewMode = (mode: 'grid' | 'table') => {
        setViewMode(mode);
        localStorage.setItem('eventViewMode', mode);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Biztosan törölni szeretnéd ezt az eseményt?')) return;
        const { error } = await supabase.from('events').delete().eq('id', id);

        if (error) {
            console.error('Hiba a törlés során:', error);
            alert('Hiba történt a törlés során.');
        } else {
            setEvents(events.filter(event => event.id !== id));
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) return;
            setUser(user);

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('date', { ascending: true });

            if (error) console.error('Hiba az események lekérdezésekor:', error);
            else setEvents(data || []);

            setLoading(false);
        };

        fetchData();
    }, [router]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500 glow-text">Adatok betöltése...</div>;
    }

    const filteredEvents = events.filter((event) => {
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
        const eventDate = new Date(event.date).getTime();
        const matchesStartDate = startDate ? eventDate >= new Date(startDate).getTime() : true;
        const matchesEndDate = endDate ? eventDate <= new Date(endDate).getTime() + 86400000 : true;
        return matchesSearch && matchesStartDate && matchesEndDate;
    });

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen text-white">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-extralight tracking-wider">VEZÉRLŐ<span className="text-gold font-bold glow-text">PULT</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-sm text-gray-400">
                        <Link href="/" className="mr-6 text-xs uppercase tracking-widest hover:text-gold transition-colors font-bold">
                            &larr; Kezdőlap
                        </Link>
                        <Link href="/profile" className="inline-flex items-center gap-2 hover:text-white transition-colors cursor-pointer group">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center text-white font-bold group-hover:shadow-[0_0_15px_var(--color-brand-blue)] transition-all overflow-hidden border border-brand-purple/50">
                                {user?.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} alt="Profil" className="w-full h-full object-cover" />
                                ) : (
                                    user?.user_metadata?.display_name ? user.user_metadata.display_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()
                                )}
                            </div>
                            {user?.user_metadata?.display_name || user?.email}
                        </Link>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="bg-transparent border border-red-500 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded text-xs tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    >
                        Kijelentkezés
                    </button>
                </div>
            </div>

            <div className="mb-8 glass-panel p-6 rounded-2xl glow-border flex flex-col sm:flex-row justify-between items-end gap-6">
                <div className="flex flex-col w-full sm:w-auto">
                    <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">Eseményeim</h2>

                    <div className="flex flex-wrap gap-4 items-center">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Keresés</label>
                            <input
                                type="text"
                                placeholder="Esemény címe..."
                                className="bg-black/40 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gold w-full sm:w-48 text-sm transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Ettől</label>
                            <input
                                type="date"
                                className="bg-black/40 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-gold text-sm transition-colors"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Eddig</label>
                            <input
                                type="date"
                                className="bg-black/40 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-gold text-sm transition-colors"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="pt-5">
                            {(searchQuery || startDate || endDate) && (
                                <button
                                    onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
                                    className="text-xs text-gold hover:text-white tracking-widest uppercase transition-colors"
                                >
                                    Törlés
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className="flex bg-black/40 border border-white/10 rounded p-1">
                        <button
                            className={`px-3 py-1 text-xs uppercase tracking-widest rounded transition-all ${viewMode === 'grid' ? 'bg-brand-blue text-white shadow-[0_0_10px_var(--color-brand-blue)]' : 'text-gray-500 hover:text-white'}`}
                            onClick={() => changeViewMode('grid')}
                        >
                            Kártyák
                        </button>
                        <button
                            className={`px-3 py-1 text-xs uppercase tracking-widest rounded transition-all ${viewMode === 'table' ? 'bg-brand-blue text-white shadow-[0_0_10px_var(--color-brand-blue)]' : 'text-gray-500 hover:text-white'}`}
                            onClick={() => changeViewMode('table')}
                        >
                            Táblázat
                        </button>
                    </div>

                    <Link href="/dashboard/new" className="bg-gradient-to-r from-gold to-yellow-600 text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-widest whitespace-nowrap hover:shadow-[0_0_15px_var(--color-gold)] transition-all">
                        + Új Esemény
                    </Link>
                </div>
            </div>

            {filteredEvents.length > 0 ? (
                <>
                    {/* KÁRTYÁS NÉZET */}
                    {viewMode === 'grid' && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredEvents.map((event) => (
                                <div key={event.id} className="glass-panel flex flex-col rounded-xl overflow-hidden relative min-h-[260px] glow-border group">
                                    {event.image_url && (
                                        <div className="w-full h-32 overflow-hidden relative border-b border-white/10 shrink-0">
                                            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        </div>
                                    )}
                                    <div className="p-6 flex-grow pb-16">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-bold text-xl line-clamp-2 pr-2 text-white group-hover:text-gold transition-colors">{event.title}</h3>
                                            {event.is_public ? (
                                                <span className="bg-brand-blue/20 border border-brand-blue/50 text-brand-blue text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold whitespace-nowrap shrink-0 shadow-[0_0_10px_var(--color-brand-blue)]">Publikus</span>
                                            ) : (
                                                <span className="bg-gray-800 border border-gray-600 text-gray-300 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold whitespace-nowrap shrink-0">Privát</span>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-2 border-b border-white/10 pb-2 inline-block">
                                            {new Date(event.date).toLocaleDateString('hu-HU')}
                                        </p>
                                        {event.location && (
                                            <p className="text-gold text-sm mb-2 font-mono">📍 <span className="text-gray-300">{event.location}</span></p>
                                        )}
                                        {event.description && (
                                            <p className="text-gray-400 mt-4 line-clamp-3 mb-14 text-sm font-light leading-relaxed">{event.description}</p>
                                        )}

                                        <div className="absolute bottom-5 right-5 flex gap-2 w-full justify-end pr-5">
                                            <Link
                                                href={`/dashboard/edit/${event.id}`}
                                                className="bg-transparent border border-white/20 text-white hover:border-gold hover:text-gold px-3 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all"
                                            >
                                                Szerkeszt
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all"
                                            >
                                                Töröl
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TÁBLÁZATOS NÉZET */}
                    {viewMode === 'table' && (
                        <div className="overflow-x-auto glass-panel rounded-xl glow-border">
                            <table className="min-w-full divide-y divide-white/10 text-sm">
                                <thead className="bg-black/20">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px]">Cím</th>
                                        <th className="px-6 py-4 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px]">Dátum</th>
                                        <th className="px-6 py-4 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px]">Helyszín</th>
                                        <th className="px-6 py-4 text-center font-bold text-brand-blue uppercase tracking-widest text-[10px]">Státusz</th>
                                        <th className="px-6 py-4 text-right font-bold text-brand-blue uppercase tracking-widest text-[10px]">Műveletek</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredEvents.map((event) => (
                                        <tr key={event.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">{event.title}</td>
                                            <td className="px-6 py-4 text-gray-400 whitespace-nowrap font-mono text-xs">{new Date(event.date).toLocaleDateString('hu-HU')}</td>
                                            <td className="px-6 py-4 text-gray-400">{event.location || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                {event.is_public ? (
                                                    <span className="bg-brand-blue/20 border border-brand-blue/50 text-brand-blue text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold shadow-[0_0_10px_var(--color-brand-blue)]">Publikus</span>
                                                ) : (
                                                    <span className="bg-gray-800 border border-gray-600 text-gray-400 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold">Privát</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <Link
                                                    href={`/dashboard/edit/${event.id}`}
                                                    className="text-gold hover:text-yellow-400 font-bold uppercase tracking-widest text-[10px] mr-4 transition-colors"
                                                >
                                                    Szerkeszt
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className="text-red-400 hover:text-red-300 font-bold uppercase tracking-widest text-[10px] transition-colors"
                                                >
                                                    Töröl
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <div className="glass-panel border border-white/10 rounded-2xl p-16 text-center mt-6">
                    <span className="text-4xl mb-4 block text-white opacity-20">(( • ))</span>
                    <p className="text-gray-400 text-xl font-light mb-4 tracking-wide">
                        {events.length > 0 ? 'Nincs a szűrésnek megfelelő esemény.' : 'Jelenleg nincsenek eseményeid.'}
                    </p>
                    {events.length > 0 && (
                        <button
                            onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
                            className="bg-transparent border border-brand-blue text-white hover:bg-brand-blue/20 px-6 py-2 rounded text-xs uppercase tracking-widest font-bold transition-all glow-border"
                        >
                            Szűrők Törlése
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}