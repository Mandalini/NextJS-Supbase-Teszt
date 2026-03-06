// app/page.tsx
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import ThemeSwitcher from './components/ThemeSwitcher';

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
        <div className="min-h-screen flex flex-col items-center">
            {/* Fejléc - REZGÉSKAPU stílusban */}
            <header className="w-full glass-panel border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl font-light tracking-[0.2em] text-white">
                            REZGÉS<span className="text-gold font-bold glow-text">KAPU</span>
                        </div>
                        <div className="hidden sm:block text-[10px] tracking-widest text-brand-blue uppercase ml-4 border-l border-brand-blue/30 pl-4">
                            Esemény Platform
                        </div>
                    </div>
                    <nav>
                        <Link
                            href="/dashboard"
                            className="bg-transparent border border-brand-blue text-white px-6 py-2 rounded-[4px] hover:bg-brand-blue/20 transition-all duration-300 uppercase tracking-widest text-xs font-semibold glow-border"
                        >
                            Vezérlőpult
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Témaválasztó sáv */}
            <ThemeSwitcher />

            {/* Fő tartalom */}
            <main className="flex-grow max-w-6xl mx-auto px-4 py-16 w-full relative">

                {/* Háttér dekokráció hópelyhek / csillagok glow illúzió */}
                <div className="absolute top-1/4 left-0 w-96 h-96 bg-brand-blue rounded-full mix-blend-screen filter blur-[150px] opacity-20 pointer-events-none"></div>
                <div className="absolute top-1/2 right-10 w-96 h-96 bg-gold rounded-full mix-blend-screen filter blur-[200px] opacity-10 pointer-events-none"></div>

                <div className="text-center mb-20 relative z-10">
                    <h2 className="text-5xl md:text-7xl font-extralight text-white mb-6 tracking-tight">
                        Fedezd fel a  <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-blue font-bold">Rendezvényeket</span>
                    </h2>
                    <p className="text-lg text-gray-400 font-light tracking-wide max-w-2xl mx-auto">
                        Csatlakozz a digitális partneri platformhoz, és légy részese a közösségi eseményeknek.
                    </p>
                </div>

                {publicEvents.length > 0 ? (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 relative z-10">
                        {publicEvents.map((event) => (
                            <Link
                                href={`/event/${event.id}`}
                                key={event.id}
                                className="glass-panel rounded-xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 glow-border group flex flex-col cursor-pointer"
                            >
                                {event.image_url && (
                                    <div className="w-full h-48 overflow-hidden relative border-b border-white/10 shrink-0">
                                        <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                    </div>
                                )}
                                <div className="p-8 flex-grow flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center shadow-[0_0_15px_var(--color-brand-blue)] shrink-0">
                                                <span className="text-white text-xs font-bold">
                                                    {new Date(event.date).getDate()}
                                                </span>
                                            </div>
                                            <div className="uppercase tracking-widest text-[10px] text-gray-400 font-semibold">
                                                {new Date(event.date).toLocaleDateString('hu-HU', {
                                                    year: 'numeric', month: 'long'
                                                })}
                                            </div>
                                        </div>

                                        <h3 className="block mt-1 text-2xl font-bold text-white mb-3 group-hover:text-gold transition-colors">
                                            {event.title}
                                        </h3>

                                        {event.location && (
                                            <p className="text-gray-400 text-sm mb-4 flex items-center gap-2 font-mono">
                                                <span className="text-gold">📍</span> {event.location}
                                            </p>
                                        )}

                                        {event.description && (
                                            <p className="mt-4 text-gray-300 line-clamp-3 leading-relaxed font-light mb-6">
                                                {event.description}
                                            </p>
                                        )}

                                        <div className="mt-auto flex justify-end">
                                            <span className="text-gold text-[10px] uppercase tracking-widest font-bold group-hover:translate-x-2 transition-transform duration-300 flex items-center gap-2">
                                                Részt veszek <span>&rarr;</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 glass-panel rounded-2xl glow-border relative z-10">
                        <span className="text-6xl mb-6 block text-white opacity-20">(( • ))</span>
                        <h3 className="text-2xl font-light text-white mb-2">Jelenleg nincs <span className="font-bold text-gold">publikus</span> esemény.</h3>
                        <p className="mt-2 text-gray-400">Térj vissza később, vagy hozz létre egy újat a vezérlőpulton.</p>
                    </div>
                )}
            </main>

            {/* Lábléc */}
            <footer className="w-full glass-panel border-t border-white/5 py-8 mt-auto z-10">
                <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-xs tracking-widest uppercase">
                    &copy; {new Date().getFullYear()} REZGÉSKAPU ESEMÉNYEK
                </div>
            </footer>
        </div>
    );
}