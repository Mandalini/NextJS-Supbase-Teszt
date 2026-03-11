"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CustomDateInput } from '@/app/components/FormControls';
import { usePermissions } from '@/app/hooks/usePermissions';

export default function DashboardPage() {
    const router = useRouter();
    const { hasPermission, hasRole, permissions, loading: permsLoading } = usePermissions();
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
    const [searchQuery, setSearchQuery] = useState(() => typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('searchQuery') || '' : '');
    const [startDate, setStartDate] = useState(() => typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('startDate') || '' : '');
    const [endDate, setEndDate] = useState(() => typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('endDate') || '' : '');
    const [statusFilter, setStatusFilter] = useState(() => typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('statusFilter') || '' : '');
    const [organizerFilter, setOrganizerFilter] = useState(() => typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('organizerFilter') || '' : '');
    const [organizers, setOrganizers] = useState<any[]>([]);

    // Nézet állapota ('grid' vagy 'table')
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Rendezési állapot
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'asc' });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

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

    useEffect(() => {
        sessionStorage.setItem('searchQuery', searchQuery);
        sessionStorage.setItem('startDate', startDate);
        sessionStorage.setItem('endDate', endDate);
        sessionStorage.setItem('statusFilter', statusFilter);
        sessionStorage.setItem('organizerFilter', organizerFilter);
    }, [searchQuery, startDate, endDate, statusFilter, organizerFilter]);

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
            const canEditAll = permissions.some(p => p.action === 'edit_any_event');

            let query = supabase
                .from('events')
                .select('*, event_attendees(count), owner:profiles!events_user_id_fkey(display_name)')
                .order('date', { ascending: true });

            if (!canEditAll) {
                query = query.eq('user_id', user.id);
            }

            const { data: orgData, error: orgError } = await query;

            if (orgError) {
                console.error('Hiba az események lekérdezésekor:', JSON.stringify(orgError));
            } else {
                setEvents(orgData || []);
            }

            // Fetch organizers list for admin filter
            if (canEditAll) {
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('id, display_name')
                    .order('display_name');
                if (profs) setOrganizers(profs);
            }

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
    }, [permsLoading, permissions, router]);

    const handleDuplicate = async (eventToCopy: any) => {
        if (!user) return;
        setLoading(true);

        const newEvent = {
            title: `${eventToCopy.title} (Másolat)`,
            description: eventToCopy.description,
            date: eventToCopy.date,
            location: eventToCopy.location,
            category: eventToCopy.category,
            image_url: eventToCopy.image_url,
            is_public: false, // a régi kompatibilitás miatt
            status: 'draft', // az új mező alapján mindig piszkozat
            user_id: user.id
        };

        const { data, error } = await supabase
            .from('events')
            .insert(newEvent)
            .select()
            .single();

        setLoading(false);

        if (error) {
            console.error("Másolási hiba:", error);
            alert("Hiba történt a másolás során.");
        } else if (data) {
            // Átirányítás a másolt esemény szerkesztési oldalára
            router.push(`/dashboard/edit/${data.id}`);
        }
    };

    const currentDataList = activeTab === 'organized' ? events : attendedEvents;

    const filteredEvents = useMemo(() => {
        let items = currentDataList.filter((event) => {
            if (!event) return false;
            const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase());
            const eventDate = new Date(event.date).getTime();
            const matchesStartDate = startDate ? eventDate >= new Date(startDate).getTime() : true;
            const matchesEndDate = endDate ? eventDate <= new Date(endDate).getTime() + 86400000 : true;
            const matchesStatus = statusFilter ? event.status === statusFilter : true;
            const matchesOrganizer = organizerFilter ? event.user_id === organizerFilter : true;

            return matchesSearch && matchesStartDate && matchesEndDate && matchesStatus && matchesOrganizer;
        });

        if (sortConfig !== null) {
            items.sort((a, b) => {
                let aValue: any = a[sortConfig.key];
                let bValue: any = b[sortConfig.key];

                // Speciális esetek pl. nested objects
                if (sortConfig.key === 'owner') {
                    aValue = a.owner?.display_name || '';
                    bValue = b.owner?.display_name || '';
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return items;
    }, [currentDataList, searchQuery, startDate, endDate, statusFilter, organizerFilter, sortConfig]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500 glow-text">Adatok betöltése...</div>;
    }

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
                                    <Link href="/dashboard/roles" className="block px-4 py-3 text-sm text-gray-300 hover:text-brand-purple hover:bg-brand-purple/10 border-b border-white/5 transition-colors flex items-center gap-2 font-bold tracking-widest uppercase text-[10px]">
                                        <span className="text-sm">👥</span> Felhasználók Kezelése
                                    </Link>
                                )}
                                {hasPermission('edit_any_event') && (
                                    <Link href="/dashboard/feltoltott-esemenyek" className="block px-4 py-3 text-sm text-gray-300 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors flex items-center gap-2 font-bold tracking-widest uppercase text-[10px]">
                                        <span className="text-sm">📥</span> Feltöltött események
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
                    {hasPermission('edit_any_event') ? (hasRole('Admin') ? 'Minden Esemény (Admin)' : 'Minden Esemény') : 'Saját Eseményeim'}
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
                    <div className="flex flex-wrap gap-3 sm:gap-4 items-end">
                        <div className="flex-1 min-w-[140px] max-w-[200px]">
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Keresés</label>
                            <input
                                type="text"
                                placeholder="Esemény címe..."
                                className="bg-black/40 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold w-full text-xs transition-colors font-mono tracking-widest"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-[125px] sm:w-[140px]">
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Ettől</label>
                            <CustomDateInput
                                value={startDate}
                                onChange={(val) => setStartDate(val)}
                            />
                        </div>
                        <div className="w-[125px] sm:w-[140px]">
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Eddig</label>
                            <CustomDateInput
                                value={endDate}
                                onChange={(val) => setEndDate(val)}
                            />
                        </div>
                        {activeTab === 'organized' && (
                            <div className="w-[120px] sm:w-[130px]">
                                <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Státusz</label>
                                <select
                                    className="bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold w-full text-xs transition-colors appearance-none tracking-widest font-mono"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="" className="bg-gray-900 text-gray-300">Összes állapot</option>
                                    <option value="published" className="bg-gray-900 text-brand-blue font-bold">Publikált</option>
                                    <option value="draft" className="bg-gray-900 text-gray-400">Piszkozat</option>
                                    <option value="cancelled" className="bg-gray-900 text-red-400">Törölt</option>
                                </select>
                            </div>
                        )}
                        {activeTab === 'organized' && hasPermission('edit_any_event') && (
                            <div className="w-[140px] sm:w-[160px]">
                                <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Szervező szerint</label>
                                <select
                                    className="bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold w-full text-xs transition-colors appearance-none tracking-widest font-mono"
                                    value={organizerFilter}
                                    onChange={(e) => setOrganizerFilter(e.target.value)}
                                >
                                    <option value="" className="bg-gray-900 text-gray-300">Minden szervező</option>
                                    {organizers.map(org => (
                                        <option key={org.id} value={org.id} className="bg-gray-900 text-white">
                                            {org.display_name || 'Névtelen'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="mb-[2px]">
                            {(searchQuery || startDate || endDate || statusFilter || organizerFilter) && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStartDate('');
                                        setEndDate('');
                                        setStatusFilter('');
                                        setOrganizerFilter('');
                                    }}
                                    className="text-[10px] px-3 py-2 border border-white/10 rounded-lg text-gold hover:text-white hover:border-gold tracking-widest uppercase transition-colors whitespace-nowrap bg-black/40"
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
                        <Link href="/dashboard/new" className="bg-gradient-to-r from-gold to-yellow-600 text-black px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap hover:shadow-[0_0_15px_var(--color-gold)] transition-all">
                            + Új
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
                                            {event.status === 'published' ? (
                                                <Link href={`/event/${event.id}`}>
                                                    <h3 className="font-bold text-xl line-clamp-2 pr-2 text-white hover:text-gold transition-colors hover:underline underline-offset-4 decoration-white/20">{event.title}</h3>
                                                </Link>
                                            ) : (
                                                <Link href={`/dashboard/edit/${event.id}`}>
                                                    <h3 className="font-bold text-xl line-clamp-2 pr-2 text-gray-500 hover:text-gray-300 transition-colors hover:underline underline-offset-4 decoration-white/20">{event.title}</h3>
                                                </Link>
                                            )}

                                            {activeTab === 'organized' && (
                                                event.status === 'published' ? (
                                                    <span className="bg-brand-blue/20 border border-brand-blue/50 text-brand-blue text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold whitespace-nowrap shrink-0 shadow-[0_0_10px_var(--color-brand-blue)]">Publikált</span>
                                                ) : event.status === 'cancelled' ? (
                                                    <span className="bg-red-900/40 border border-red-600/50 text-red-400 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold whitespace-nowrap shrink-0">Törölt</span>
                                                ) : (
                                                    <span className="bg-gray-800 border border-gray-600 text-gray-300 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold whitespace-nowrap shrink-0">Piszkozat</span>
                                                )
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-1 mb-2 border-b border-white/10 pb-2">
                                            <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest ">
                                                {new Date(event.date).toLocaleDateString('hu-HU')}
                                            </p>
                                            <p className="text-brand-blue text-[9px] font-bold uppercase tracking-[0.2em]">
                                                👤 {event.owner?.display_name || 'Ismeretlen'}
                                            </p>
                                        </div>
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
                                            <p className="text-gray-400 mt-4 line-clamp-3 mb-14 text-sm font-light leading-relaxed">{event.description.replace(/<[^>]+>/g, ' ')}</p>
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
                                                        onClick={() => handleDuplicate(event)}
                                                        className="bg-transparent border border-brand-purple/50 text-brand-purple hover:bg-brand-purple/20 px-3 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all"
                                                    >
                                                        Másol
                                                    </button>
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
                            <table className="min-w-full divide-y divide-white/10 text-sm table-fixed">
                                <thead className="bg-black/20">
                                    <tr>
                                        <th
                                            onClick={() => requestSort('title')}
                                            className="w-[30%] px-2 py-5 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px] cursor-pointer hover:bg-white/5 transition-colors group"
                                        >
                                            <div className="flex items-center">
                                                Cím {sortConfig?.key === 'title' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <span className="opacity-0 group-hover:opacity-40 ml-1">↕</span>}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => requestSort('owner')}
                                            className="w-[12%] px-2 py-5 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px] cursor-pointer hover:bg-white/5 transition-colors group"
                                        >
                                            <div className="flex items-center">
                                                Szervező {sortConfig?.key === 'owner' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <span className="opacity-0 group-hover:opacity-40 ml-1">↕</span>}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => requestSort('date')}
                                            className="w-[10%] px-2 py-5 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px] cursor-pointer hover:bg-white/5 transition-colors group"
                                        >
                                            <div className="flex items-center">
                                                Dátum {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <span className="opacity-0 group-hover:opacity-40 ml-1">↕</span>}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => requestSort('category')}
                                            className="w-[10%] px-2 py-4 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px] cursor-pointer hover:bg-white/5 transition-colors group"
                                        >
                                            <div className="flex items-center">
                                                Kategória {sortConfig?.key === 'category' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <span className="opacity-0 group-hover:opacity-40 ml-1">↕</span>}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => requestSort('location')}
                                            className="w-[10%] px-2 py-4 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px] cursor-pointer hover:bg-white/5 transition-colors group"
                                        >
                                            <div className="flex items-center">
                                                Helyszín {sortConfig?.key === 'location' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <span className="opacity-0 group-hover:opacity-40 ml-1">↕</span>}
                                            </div>
                                        </th>
                                        {activeTab === 'organized' && (
                                            <>
                                                <th className="w-[7%] px-2 py-4 text-center font-bold text-brand-blue uppercase tracking-widest text-[10px]">Résztvevők</th>
                                                <th className="w-[9%] px-2 py-4 text-center font-bold text-brand-blue uppercase tracking-widest text-[10px]">Státusz</th>
                                            </>
                                        )}
                                        <th className="w-[12%] min-w-[120px] px-2 py-4 text-right font-bold text-brand-blue uppercase tracking-widest text-[10px]">Műveletek</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredEvents.map((event) => (
                                        <tr key={event.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-2 py-4 font-bold text-white max-w-0">
                                                {(event.status === 'published' && activeTab === 'attended') ? (
                                                    <Link href={`/event/${event.id}`} className="hover:text-gold transition-colors block truncate pr-2">
                                                        {event.title}
                                                    </Link>
                                                ) : (
                                                    <Link href={`/dashboard/edit/${event.id}`} className="hover:text-gray-300 text-brand-blue transition-colors block truncate pr-2 decoration-brand-blue/30 hover:underline underline-offset-4">
                                                        {event.title}
                                                    </Link>
                                                )}
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap max-w-0">
                                                <div className="text-[11px] text-gray-300 font-bold uppercase tracking-wider truncate">{event.owner?.display_name || 'Ismeretlen'}</div>
                                            </td>
                                            <td className="px-2 py-4 text-gray-400 whitespace-nowrap font-mono text-[11px]">{new Date(event.date).toLocaleDateString('hu-HU')}</td>
                                            <td className="px-2 py-4 text-gray-400 text-xs truncate">{event.category || '-'}</td>
                                            <td className="px-2 py-4 text-gray-400 text-xs truncate">{event.location || '-'}</td>

                                            {activeTab === 'organized' && (
                                                <>
                                                    <td className="px-2 py-4 text-center font-bold text-brand-blue whitespace-nowrap text-xs">
                                                        <span
                                                            className="text-sm mr-1 cursor-pointer hover:text-white transition-colors"
                                                            onClick={() => openAttendeesModal(event.id, event.title)}
                                                            title="Kattints a résztvevőkért"
                                                        >
                                                            👥
                                                        </span>
                                                        {event.event_attendees?.[0]?.count || 0}
                                                    </td>
                                                    <td className="px-2 py-4 text-center">
                                                        {event.status === 'published' ? (
                                                            <span className="bg-brand-blue/20 border border-brand-blue/50 text-brand-blue text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold shadow-[0_0_10px_var(--color-brand-blue)]">Publikált</span>
                                                        ) : event.status === 'cancelled' ? (
                                                            <span className="bg-red-900/40 border border-red-600/50 text-red-400 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">Törölt</span>
                                                        ) : (
                                                            <span className="bg-gray-800 border border-gray-600 text-gray-400 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold">Piszkozat</span>
                                                        )}
                                                    </td>
                                                </>
                                            )}

                                            <td className="px-2 py-4 text-right whitespace-nowrap min-w-[120px]">
                                                {activeTab === 'organized' ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Link
                                                            href={`/dashboard/edit/${event.id}`}
                                                            title="Szerkesztés"
                                                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-gold hover:bg-gold hover:text-black transition-all group shadow-inner"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDuplicate(event)}
                                                            title="Másolás"
                                                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-brand-purple hover:bg-brand-purple hover:text-white transition-all shadow-inner"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(event.id)}
                                                            title="Törlés"
                                                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-inner"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <Link
                                                            href={`/event/${event.id}`}
                                                            title="Megtekintés"
                                                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-brand-blue hover:bg-brand-blue hover:text-white transition-all shadow-inner"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleCancelAttendance(event.id)}
                                                            title="Leiratkozás"
                                                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:bg-white/20 hover:text-white transition-all shadow-inner"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                            </svg>
                                                        </button>
                                                    </div>
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
            )
            }

            {/* Modal a résztvevőknek */}
            {
                isModalOpen && (
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
                )
            }
        </div >
    );
}