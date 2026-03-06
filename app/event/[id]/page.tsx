import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EventButtons from './EventButtons';
import AttendeesList from './AttendeesList';

export const revalidate = 0;

export default async function PublicEventPage({ params }: { params: Promise<{ id: string }> }) {
    // 1. Paraméterek feloldása Next 15 szerint
    const resolvedParams = await params;

    // 2. Esemény adatainak lekérdezése
    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();

    if (error || !event || !event.is_public) {
        // Ha nincs adat, hiba van, vagy az esemény nem publikus, 404 oldalt adunk
        notFound();
    }

    return (
        <div className="min-h-screen flex flex-col items-center bg-[var(--color-background)] text-gray-300">
            {/* Fejléc */}
            <header className="w-full glass-panel border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="text-xl font-light tracking-[0.2em] text-white group-hover:text-brand-blue transition-colors">
                            REZGÉS<span className="text-gold font-bold glow-text">KAPU</span>
                        </div>
                    </Link>
                    <nav>
                        <Link
                            href="/"
                            className="px-4 py-2 rounded-full border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10 text-xs uppercase tracking-widest transition-colors font-bold shadow-[0_0_10px_var(--color-brand-blue)]/20"
                        >
                            &larr; Kezdőlap
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Fő tartalom */}
            <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-8 relative z-10">
                <div className="glass-panel p-6 md:p-8 rounded-3xl glow-border shadow-2xl relative overflow-hidden">

                    {/* Háttér dekokráció hópelyhek / csillagok glow illúzió */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>

                    {/* Borítókép */}
                    {event.image_url && (
                        <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-8 relative border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-background)]/80 via-transparent to-transparent"></div>
                        </div>
                    )}

                    {/* Fejléc információk */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-white/10 pb-8 mb-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="uppercase tracking-widest text-[10px] text-gray-400 font-bold bg-brand-blue/20 text-brand-blue px-3 py-1 rounded-full border border-brand-blue/30">
                                    {new Date(event.date).toLocaleDateString('hu-HU', {
                                        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
                                    })}
                                </div>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extralight text-white leading-tight">
                                {event.title}
                            </h1>
                        </div>

                        <div className="md:w-64 flex-shrink-0 bg-black/40 border border-white/10 rounded-2xl p-5 shadow-inner backdrop-blur-md">
                            <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Részletek</h3>

                            <div className="flex items-start gap-2 mt-3">
                                <span className="text-gold text-base mt-0.5">📅</span>
                                <div>
                                    <p className="text-white text-xs font-bold">Dátum</p>
                                    <p className="text-gray-400 text-[10px] font-mono mt-0.5">
                                        {new Date(event.date).toLocaleDateString('hu-HU')}
                                    </p>
                                </div>
                            </div>

                            {event.location && (
                                <div className="flex items-start gap-2 mt-4">
                                    <span className="text-brand-blue text-base mt-0.5">📍</span>
                                    <div>
                                        <p className="text-white text-xs font-bold">Helyszín</p>
                                        <p className="text-gray-400 text-[10px] font-mono mt-0.5 break-words">
                                            {event.location}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Leírás */}
                    <div>
                        <h2 className="text-xs text-gold uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
                            <span className="w-6 h-[1px] bg-gold block"></span>
                            Esemény Leírása
                        </h2>
                        {event.description ? (
                            <div className="text-gray-300 font-light leading-relaxed whitespace-pre-wrap text-lg">
                                {event.description}
                            </div>
                        ) : (
                            <p className="text-gray-600 font-light italic">Nincs megadva részletes leírás ehhez az eseményhez.</p>
                        )}
                    </div>

                    {/* Megosztás / Jelentkezés szekció */}
                    <EventButtons eventId={event.id} />

                    {/* Résztvevők listája */}
                    <AttendeesList eventId={event.id} />

                </div>
            </main>

            {/* Lábléc */}
            <footer className="w-full border-t border-white/5 py-8 mt-auto z-10 glass-panel">
                <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-xs tracking-widest uppercase">
                    &copy; {new Date().getFullYear()} REZGÉSKAPU ESEMÉNYEK
                </div>
            </footer>
        </div>
    );
}
