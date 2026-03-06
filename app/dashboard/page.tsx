"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CustomDateInput } from '@/app/components/FormControls';
import { usePermissions } from '@/app/hooks/usePermissions';

export default function DashboardPage() {
    const router = useRouter();
    const { hasPermission, permissions, loading: permsLoading } = usePermissions();
    const [user, setUser] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [attendedEvents, setAttendedEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fülek (Saját vs Részvételeim)
    const [activeTab, setActiveTab] = useState<'organized' | 'attended'>('organized');

    // Résztvevők Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalEventTitle, setModalEventTitle] = useState('');
    const [attendeesList, setAttendeesList] = useState<any[]>([]);
    const [modalLoading, setModalLoading] = useState(false);

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

    const handleCancelAttendance = async (eventId: string) => {
        if (!user) return;
        if (!confirm('Biztosan nem veszel részt ezen az eseményen?')) return;

        const { error } = await supabase
            .from('event_attendees')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Hiba leiratkozáskor:', error);
            alert('Hiba történt leiratkozáskor.');
        } else {
            setAttendedEvents(attendedEvents.filter(e => e.id !== eventId));
        }
    };

    const openAttendeesModal = async (eventId: string, title: string) => {
        setIsModalOpen(true);
        setModalEventTitle(title);
        setModalLoading(true);
        setAttendeesList([]);

        // 1. Lépés: event_attendees-ből a user ID-k
        const { data: attData, error: attError } = await supabase
            .from('event_attendees')
            .select('user_id')
            .eq('event_id', eventId);

        if (attError) {
            console.error("Hiba a résztvevők betöltésekor:", attError);
            setModalLoading(false);
            return;
        }

        if (attData && attData.length > 0) {
            const userIds = attData.map((d: any) => d.user_id);
            // 2. Lépés: Profil adatok lekérdezése public.profiles táblából
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', userIds);

            if (profilesError) {
                console.error("Hiba a profil adatok lekérésekor:", profilesError);
            } else {
                setAttendeesList(profilesData || []);
            }
        } else {
            setAttendeesList([]);
        }

        setModalLoading(false);
    };

    useEffect(() => {
        // Megvárjuk, amíg a jogosultságok betöltődnek a usePermissions hookból.
        // Ha még töltődnek, nem futtatjuk a lekérdezést.
        if (permsLoading) return;

        const fetchData = async () => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                router.push('/login');
                return;
            }
            setUser(user);

            // Fetch organized events
            // A permissions tömb itt STABIL referencia, nem okoz újraalapítást
            const canEditAll = permissions.some(p => p.action === 'edit_any_event');

            let query = supabase
                .from('events')
                .select('*, event_attendees(count)')
                .order('date', { ascending: true });

            // Ha nincs 'edit_any_event' joga, akkor csak a sajátjait lássa a "Saját Eseményeim" alatt
            if (!canEditAll) {
                query = query.eq('created_by', user.id);
            }

            const { data: orgData, error: orgError } = await query;

            if (orgError) console.error('Hiba az események lekérdezésekor:', orgError);
            else setEvents(orgData || []);

            // Fetch attended events
            const { data: attData, error: attError } = await supabase
                .from('event_attendees')
                .select('event_id, events(*, event_attendees(count))')
                .eq('user_id', user.id);

            if (attError) {
                console.error("Hiba a résztvett események lekérdezésekor:", attError);
            } else if (attData) {
                const mapEvents = attData.map((d: any) => d.events);
                // Sort array
                mapEvents.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setAttendedEvents(mapEvents);
            }

            setLoading(false);
        };

        fetchData();
        // permissions tömb változásakor fut le (csak egyszer, miután a hook betöltött).
        // A hasPermission függvény NEM kerül ide, mert minden renderben új referenciát kap.
    }, [permsLoading, permissions, router]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500 glow-text">Adatok betöltése...</div>;
    }

    const currentDataList = activeTab === 'organized' ? events : attendedEvents;

    const filteredEvents = currentDataList.filter((event) => {
        if (!event) return false;
        const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const eventDate = new Date(event.date).getTime();
        const matchesStartDate = startDate ? eventDate >= new Date(startDate).getTime() : true;
        const matchesEndDate = endDate ? eventDate <= new Date(endDate).getTime() + 86400000 : true;
        return matchesSearch && matchesStartDate && matchesEndDate;
    });

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen text-white relative">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-extralight tracking-wider">VEZÉRLŐ<span className="text-gold font-bold glow-text">PULT</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-6 text-sm text-gray-400 pr-5 border-r border-white/10 h-10 relative z-50">

                        <Link href="/profile" className="inline-flex items-center gap-2 hover:text-white transition-colors cursor-pointer group pr-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center text-white font-bold group-hover:shadow-[0_0_15px_var(--color-brand-blue)] transition-all overflow-hidden border border-brand-purple/50">
                                {user?.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} alt="Profil" className="w-full h-full object-cover" />
                                ) : (
                                    user?.user_metadata?.display_name ? user.user_metadata.display_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <span className="hidden lg:inline-block max-w-[120px] truncate font-bold">{user?.user_metadata?.display_name || user?.email?.split('@')[0]}</span>
                        </Link>

                        {/* Hamburger Dropdown / Beállítások */}
                        <div className="relative group border-l border-white/10 pl-4">
                            <button className="text-white hover:text-brand-blue transition-colors p-2 rounded-full hover:bg-white/5 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                </svg>
                            </button>

                            {/* Dropdown panel */}
                            <div className="absolute right-0 mt-2 w-56 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
                                <Link href="/" className="block px-4 py-3 text-sm text-gray-300 hover:text-brand-blue hover:bg-brand-blue/10 border-b border-white/5 transition-colors flex items-center gap-2">
                                    <span className="text-lg">&larr;</span> Kezdőlap
                                </Link>
                                {hasPermission('manage_categories') && (
                                    <Link href="/dashboard/categories" className="block px-4 py-3 text-sm text-gray-300 hover:text-gold hover:bg-gold/10 border-b border-white/5 transition-colors flex items-center gap-2 font-bold tracking-widest uppercase text-[10px]">
                                        <span className="text-sm">🏷</span> Kategóriák Kezelése
                                    </Link>
                                )}
                                {hasPermission('manage_roles') && (
                                    <Link href="/dashboard/roles" className="block px-4 py-3 text-sm text-gray-300 hover:text-brand-purple hover:bg-brand-purple/10 transition-colors flex items-center gap-2 font-bold tracking-widest uppercase text-[10px]">
                                        <span className="text-sm">👥</span> Felhasználók Kezelése
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="text-red-400 hover:text-white transition-colors p-2 rounded-full hover:bg-red-500/80 bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-500/20"
                        title="Kijelentkezés"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Fülek navigáció */}
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('organized')}
                    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'organized'
                        ? 'bg-brand-blue text-white shadow-[0_0_15px_var(--color-brand-blue)] border border-brand-blue'
                        : 'bg-black/40 text-gray-400 hover:text-white border border-white/10'
                        }`}
                >
                    Organizált Eseményeim
                </button>
                <button
                    onClick={() => setActiveTab('attended')}
                    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'attended'
                        ? 'bg-gold text-black shadow-[0_0_15px_var(--color-gold)] border border-gold'
                        : 'bg-black/40 text-gray-400 hover:text-white border border-white/10'
                        }`}
                >
                    Események amin részt veszek
                </button>
            </div>

            <div className="mb-8 glass-panel p-6 rounded-2xl glow-border flex flex-col sm:flex-row justify-between items-end gap-6">
                <div className="flex flex-col w-full sm:w-auto">
                    <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">
                        {activeTab === 'organized'
                            ? (hasPermission('edit_any_event') ? 'Rendszer Eseményei (Admin)' : 'Saját Eseményeim')
                            : 'Részvételeim'}
                    </h2>

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
                        <div className="w-48">
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Ettől</label>
                            <CustomDateInput
                                value={startDate}
                                onChange={(val) => setStartDate(val)}
                            />
                        </div>
                        <div className="w-48">
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Eddig</label>
                            <CustomDateInput
                                value={endDate}
                                onChange={(val) => setEndDate(val)}
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

                    {activeTab === 'organized' && (
                        <Link href="/dashboard/new" className="bg-gradient-to-r from-gold to-yellow-600 text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-widest whitespace-nowrap hover:shadow-[0_0_15px_var(--color-gold)] transition-all">
                            + Új Esemény
                        </Link>
                    )}
                </div>
            </div>

            {filteredEvents.length > 0 ? (
                <>
                    {/* KÁRTYÁS NÉZET */}
                    {viewMode === 'grid' && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredEvents.map((event) => (
                                <div key={event.id} className="glass-panel flex flex-col rounded-xl overflow-hidden relative min-h-[260px] glow-border group">
                                    {event.category && (
                                        <div className="absolute top-4 right-4 z-20 bg-brand-blue/90 backdrop-blur text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full shadow-[0_0_10px_var(--color-brand-blue)]">
                                            {event.category}
                                        </div>
                                    )}

                                    {event.image_url && (
                                        <div className="w-full h-32 overflow-hidden relative border-b border-white/10 shrink-0">
                                            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        </div>
                                    )}
                                    <div className="p-6 flex-grow pb-16">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-bold text-xl line-clamp-2 pr-2 text-white group-hover:text-gold transition-colors">{event.title}</h3>

                                            {activeTab === 'organized' && (
                                                event.is_public ? (
                                                    <span className="bg-brand-blue/20 border border-brand-blue/50 text-brand-blue text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold whitespace-nowrap shrink-0 shadow-[0_0_10px_var(--color-brand-blue)]">Publikus</span>
                                                ) : (
                                                    <span className="bg-gray-800 border border-gray-600 text-gray-300 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold whitespace-nowrap shrink-0">Privát</span>
                                                )
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-2 border-b border-white/10 pb-2 inline-block">
                                            {new Date(event.date).toLocaleDateString('hu-HU')}
                                        </p>
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                            {event.location && (
                                                <p className="text-gold text-sm font-mono flex-1">📍 <span className="text-gray-300">{event.location}</span></p>
                                            )}
                                            {activeTab === 'organized' && (
                                                <div
                                                    title="Kattints a résztvevőkért"
                                                    className="bg-brand-blue/10 border border-brand-blue/30 px-2 py-1 rounded text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 text-brand-blue shrink-0 shadow-[0_0_10px_var(--color-brand-blue)]/20 cursor-pointer hover:bg-brand-blue/30 transition-colors"
                                                    onClick={() => openAttendeesModal(event.id, event.title)}
                                                >
                                                    <span className="text-sm block">👥</span> {event.event_attendees?.[0]?.count || 0} fő
                                                </div>
                                            )}
                                        </div>
                                        {event.description && (
                                            <p className="text-gray-400 mt-4 line-clamp-3 mb-14 text-sm font-light leading-relaxed">{event.description}</p>
                                        )}

                                        <div className="absolute bottom-5 right-5 flex gap-2 w-full justify-end pr-5">
                                            {activeTab === 'organized' ? (
                                                <>
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
                                                </>
                                            ) : (
                                                <>
                                                    <Link
                                                        href={`/event/${event.id}`}
                                                        className="bg-brand-blue/20 border border-brand-blue/50 text-brand-blue hover:bg-brand-blue/30 px-3 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all"
                                                    >
                                                        Megtekintés
                                                    </Link>
                                                    <button
                                                        onClick={() => handleCancelAttendance(event.id)}
                                                        className="bg-transparent border border-gray-500/50 text-gray-400 hover:bg-gray-500/20 px-3 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all hover:text-white"
                                                    >
                                                        Nem veszek részt
                                                    </button>
                                                </>
                                            )}
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
                                        <th className="px-6 py-4 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px]">Kategória</th>
                                        <th className="px-6 py-4 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px]">Helyszín</th>
                                        {activeTab === 'organized' && (
                                            <>
                                                <th className="px-6 py-4 text-center font-bold text-brand-blue uppercase tracking-widest text-[10px]">Résztvevők</th>
                                                <th className="px-6 py-4 text-center font-bold text-brand-blue uppercase tracking-widest text-[10px]">Státusz</th>
                                            </>
                                        )}
                                        <th className="px-6 py-4 text-right font-bold text-brand-blue uppercase tracking-widest text-[10px]">Műveletek</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredEvents.map((event) => (
                                        <tr key={event.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">{event.title}</td>
                                            <td className="px-6 py-4 text-gray-400 whitespace-nowrap font-mono text-xs">{new Date(event.date).toLocaleDateString('hu-HU')}</td>
                                            <td className="px-6 py-4 text-gray-400">{event.category || '-'}</td>
                                            <td className="px-6 py-4 text-gray-400">{event.location || '-'}</td>

                                            {activeTab === 'organized' && (
                                                <>
                                                    <td className="px-6 py-4 text-center font-bold text-brand-blue whitespace-nowrap">
                                                        <span
                                                            className="text-sm mr-1 cursor-pointer hover:text-white transition-colors"
                                                            onClick={() => openAttendeesModal(event.id, event.title)}
                                                            title="Kattints a résztvevőkért"
                                                        >
                                                            👥
                                                        </span>
                                                        {event.event_attendees?.[0]?.count || 0}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {event.is_public ? (
                                                            <span className="bg-brand-blue/20 border border-brand-blue/50 text-brand-blue text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold shadow-[0_0_10px_var(--color-brand-blue)]">Publikus</span>
                                                        ) : (
                                                            <span className="bg-gray-800 border border-gray-600 text-gray-400 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold">Privát</span>
                                                        )}
                                                    </td>
                                                </>
                                            )}

                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                {activeTab === 'organized' ? (
                                                    <>
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
                                                    </>
                                                ) : (
                                                    <>
                                                        <Link
                                                            href={`/event/${event.id}`}
                                                            className="text-brand-blue hover:text-blue-300 font-bold uppercase tracking-widest text-[10px] mr-4 transition-colors"
                                                        >
                                                            Megtekintés
                                                        </Link>
                                                        <button
                                                            onClick={() => handleCancelAttendance(event.id)}
                                                            className="text-gray-400 hover:text-white font-bold uppercase tracking-widest text-[10px] transition-colors"
                                                        >
                                                            Leiratkozás
                                                        </button>
                                                    </>
                                                )}
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
                        {events.length > 0 || attendedEvents.length > 0 ? 'Nincs a szűrésnek megfelelő esemény.' : (activeTab === 'organized' ? 'Jelenleg nincsenek szervezett eseményeid.' : 'Még nem jelentkeztél egyetlen eseményre sem.')}
                    </p>
                    {(events.length > 0 || attendedEvents.length > 0) && (searchQuery || startDate || endDate) && (
                        <button
                            onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
                            className="bg-transparent border border-brand-blue text-white hover:bg-brand-blue/20 px-6 py-2 rounded text-xs uppercase tracking-widest font-bold transition-all glow-border"
                        >
                            Szűrők Törlése
                        </button>
                    )}
                </div>
            )}

            {/* Modal a résztvevőknek */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="glass-panel rounded-2xl glow-border border border-white/20 p-8 max-w-lg w-full relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-bold text-white mb-2">Résztvevők</h2>
                        <h3 className="text-gold text-sm font-light mb-6 uppercase tracking-widest">{modalEventTitle}</h3>

                        {modalLoading ? (
                            <div className="text-center text-gray-400 py-8">Betöltés...</div>
                        ) : attendeesList.length > 0 ? (
                            <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {attendeesList.map((attendee, index) => {
                                    return (
                                        <li key={index} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/10">
                                            <div className="w-10 h-10 rounded-full bg-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0 uppercase font-bold text-xs ring-1 ring-brand-blue/50 overflow-hidden">
                                                {attendee.avatar_url ? (
                                                    <img src={attendee.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    attendee.display_name ? attendee.display_name.charAt(0) : "V"
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm">{attendee.display_name || 'Névtelen Felhasználó'}</p>
                                                <p className="text-gray-500 text-xs font-mono truncate max-w-[200px]">{attendee.email || attendee.id}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="text-center text-gray-400 py-8 border border-dashed border-white/20 rounded-xl">
                                Még nincs regisztrált résztvevő.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}