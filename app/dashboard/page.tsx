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

            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Eseményeim</h2>
                <Link href="/dashboard/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block">
                    + Új esemény
                </Link>
            </div>

            {events.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => (
                        <div key={event.id} className="border border-gray-200 p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow relative min-h-[220px]">
                            <h3 className="font-bold text-xl mb-2">{event.title}</h3>
                            <p className="text-blue-600 font-medium mb-2">
                                {new Date(event.date).toLocaleDateString('hu-HU')}
                            </p>
                            {event.location && ( // Csak akkor jelenik meg, ha nem üres
                                <p className="text-gray-600 text-sm mb-2">📍 {event.location}</p>
                            )}
                            {event.description && (
                                <p className="text-gray-700 mt-3 line-clamp-3 mb-10">{event.description}</p>
                            )}

                            {/* Szerkesztés és Törlés gombok egy fix helyen, alul jobb oldalt */}
                            <div className="absolute bottom-5 right-5 flex gap-2">
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
            ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <p className="text-gray-500 text-lg mb-4">Jelenleg nincsenek eseményeid.</p>
                </div>
            )}
        </div>
    );
}