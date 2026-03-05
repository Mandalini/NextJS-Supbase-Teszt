// app/page.tsx
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Ezzel jelezzük a Next.js-nek, hogy ne cache-elje statikusan a lekérdezést, 
// hanem minden letöltéskor frissítse, hogy az új események is ott legyenek.
export const revalidate = 0;

export default async function Home() {
    // Csak azokat az eseményeket kérjük le, amiket a felhasználó publikusra állított
    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_public', true)
        .order('date', { ascending: true });

    if (error) {
        console.error('Hiba a publikus események betöltésekor:', error);
    }

    const publicEvents = events || [];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Fejléc */}
            <header className="bg-white shadow">
                <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Minden Esemény</h1>
                    <nav>
                        <Link
                            href="/dashboard"
                            className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition"
                        >
                            Irány a Vezérlőpult
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Fő tartalom */}
            <main className="flex-grow max-w-6xl mx-auto px-4 py-12 w-full">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
                        Fedezd fel a Nyitott Rendezvényeket
                    </h2>
                    <p className="text-xl text-gray-600">
                        Böngéssz mások publikus eseményei között!
                    </p>
                </div>

                {publicEvents.length > 0 ? (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {publicEvents.map((event) => (
                            <div
                                key={event.id}
                                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                            >
                                <div className="p-6">
                                    <div className="uppercase tracking-wide text-sm text-blue-600 font-semibold mb-1">
                                        {new Date(event.date).toLocaleDateString('hu-HU', {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </div>
                                    <h3 className="block mt-1 text-lg leading-tight font-bold text-gray-900 mb-2">
                                        {event.title}
                                    </h3>

                                    {event.location && (
                                        <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                                            <span>📍</span> {event.location}
                                        </p>
                                    )}

                                    {event.description && (
                                        <p className="mt-2 text-gray-700 line-clamp-4">
                                            {event.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                        <span className="text-4xl mb-4 block">📅</span>
                        <h3 className="text-lg font-medium text-gray-900">Jelenleg nincs publikus esemény.</h3>
                        <p className="mt-1 text-gray-500">Még senki nem hozott létre nyílt rendezvényt.</p>
                    </div>
                )}
            </main>

            {/* Lábléc */}
            <footer className="bg-white py-6 border-t border-gray-200 mt-auto">
                <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} My Event App
                </div>
            </footer>
        </div>
    );
}