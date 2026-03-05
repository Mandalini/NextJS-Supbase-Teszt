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

    // Kijelentkezést kezelő függvény
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh(); // Törli a Next.js cache-t, így a middleware rögtön észleli a változást
    };

    // Törlés függvény
    const handleDelete = async (id: string) => {
        if (!confirm('Biztosan törölni szeretnéd ezt az eseményt?')) return;

        // Itt nem mutatunk betöltő ikont, rögtön meghívjuk a DB-t
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Hiba a törlés során:', error);
            alert('Hiba történt a törlés során.');
        } else {
            // Frissítjük a state-et a törölt elem nélkül
            setEvents(events.filter(event => event.id !== id));
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            // 1. Felhasználó ellenőrzése
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                // A middleware úgyis kidobja, ha nincs bejelentkezve
                return;
            }

            setUser(user);

            // 2. Események lekérdezése
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('date', { ascending: true });

            if (error) {
                console.error('Hiba az események lekérdezésekor:', error);
            } else {
                setEvents(data || []);
            }

            setLoading(false);
        };

        fetchData();
    }, [router]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Adatok betöltése...</div>;
    }

    // Szűrt események alkalmazása
    const filteredEvents = events.filter((event) => {
        // Cím alapján szűrés
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());

        // Dátum alapján szűrés
        const eventDate = new Date(event.date).getTime();
        const matchesStartDate = startDate ? eventDate >= new Date(startDate).getTime() : true;
        // Az endDate esetében a nap végéig engedjük
        const matchesEndDate = endDate ? eventDate <= new Date(endDate).getTime() + 86400000 : true;

        return matchesSearch && matchesStartDate && matchesEndDate;
    });

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold">Vezérlőpult</h1>

                {/* Jobb felső sarok: Email + Kijelentkezés gomb */}
                <div className="flex items-center gap-4">
                    <p className="text-gray-600">Bejelentkezve mint: <span className="font-semibold">{user?.email}</span></p>
                    <button
                        onClick={handleSignOut}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors"
                    >
                        Kijelentkezés
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-end gap-4 border-b pb-4">
                <div className="flex flex-col w-full sm:w-auto">
                    <h2 className="text-2xl font-semibold mb-4">Eseményeim</h2>

                    {/* Szűrő űrlap */}
                    <div className="flex flex-wrap gap-4 items-center">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Keresés</label>
                            <input
                                type="text"
                                placeholder="Esemény címe..."
                                className="border rounded px-3 py-1.5 text-sm w-full sm:w-48"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Ettől</label>
                            <input
                                type="date"
                                className="border rounded px-3 py-1.5 text-sm"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Eddig</label>
                            <input
                                type="date"
                                className="border rounded px-3 py-1.5 text-sm"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="pt-5">
                            {(searchQuery || startDate || endDate) && (
                                <button
                                    onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    Szűrők törlése
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    {/* Nézetváltó gombok */}
                    <div className="flex bg-gray-100 rounded p-1">
                        <button
                            className={`px-3 py-1 text-sm rounded ${viewMode === 'grid' ? 'bg-white shadow-sm font-medium' : 'text-gray-600'}`}
                            onClick={() => setViewMode('grid')}
                        >
                            Kártyák
                        </button>
                        <button
                            className={`px-3 py-1 text-sm rounded ${viewMode === 'table' ? 'bg-white shadow-sm font-medium' : 'text-gray-600'}`}
                            onClick={() => setViewMode('table')}
                        >
                            Táblázat
                        </button>
                    </div>

                    <Link href="/dashboard/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block text-sm font-medium whitespace-nowrap">
                        + Új esemény
                    </Link>
                </div>
            </div>

            {filteredEvents.length > 0 ? (
                <>
                    {/* KÁRTYÁS NÉZET */}
                    {viewMode === 'grid' && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredEvents.map((event) => (
                                <div key={event.id} className="border border-gray-200 p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow relative min-h-[220px] bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-xl line-clamp-2 pr-2">{event.title}</h3>
                                        {/* Publikus státusz jelvény */}
                                        {event.is_public ? (
                                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap shrink-0">Publikus</span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap shrink-0">Privát</span>
                                        )}
                                    </div>
                                    <p className="text-blue-600 font-medium mb-2">
                                        {new Date(event.date).toLocaleDateString('hu-HU')}
                                    </p>
                                    {event.location && (
                                        <p className="text-gray-600 text-sm mb-2">📍 {event.location}</p>
                                    )}
                                    {event.description && (
                                        <p className="text-gray-700 mt-3 line-clamp-3 mb-12 text-sm">{event.description}</p>
                                    )}

                                    {/* Szerkesztés és Törlés gombok */}
                                    <div className="absolute bottom-5 right-5 flex gap-2 w-full justify-end pr-5">
                                        <Link
                                            href={`/dashboard/edit/${event.id}`}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                        >
                                            Szerkesztés
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(event.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                        >
                                            Törlés
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TÁBLÁZATOS NÉZET */}
                    {viewMode === 'table' && (
                        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-600">Cím</th>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-600">Dátum</th>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-600">Helyszín</th>
                                        <th className="px-6 py-3 text-center font-semibold text-gray-600">Státusz</th>
                                        <th className="px-6 py-3 text-right font-semibold text-gray-600">Műveletek</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredEvents.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{event.title}</td>
                                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{new Date(event.date).toLocaleDateString('hu-HU')}</td>
                                            <td className="px-6 py-4 text-gray-600">{event.location || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                {event.is_public ? (
                                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Publikus</span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">Privát</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <Link
                                                    href={`/dashboard/edit/${event.id}`}
                                                    className="text-yellow-600 hover:text-yellow-800 font-medium mr-4"
                                                >
                                                    Szerkesztés
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className="text-red-600 hover:text-red-800 font-medium"
                                                >
                                                    Törlés
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
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mt-6">
                    <p className="text-gray-500 text-lg mb-2">
                        {events.length > 0 ? 'Nincs a szűrésnek megfelelő esemény.' : 'Jelenleg nincsenek eseményeid.'}
                    </p>
                    {events.length > 0 && (
                        <button
                            onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
                            className="text-blue-600 hover:underline text-sm font-medium"
                        >
                            Szűrők törlése
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}