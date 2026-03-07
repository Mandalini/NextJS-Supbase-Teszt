// app/page.tsx
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import HeaderActions from './components/HeaderActions';
import HomeEventList from './components/HomeEventList';

// Ezzel jelezzük a Next.js-nek, hogy ne cache-elje statikusan a lekérdezést, 
// hanem minden letöltéskor frissítse, hogy az új események is ott legyenek.
export const revalidate = 0;

export default async function Home() {
    // Csak azokat az eseményeket kérjük le, amiket a felhasználó publikusra állított
    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published') // Új szűrés a publikált státuszra
        .order('date', { ascending: true });

    if (error) {
        console.error('Hiba a publikus események betöltésekor:', error);
    }

    const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

    if (catError) {
        console.error('Hiba a kategóriák betöltésekor:', catError);
    }

    const publicEvents = events || [];
    const categories = catData || [];

    return (
        <div className="min-h-screen flex flex-col items-center">
            {/* Fejléc - REZGÉSKAPU stílusban */}
            <header className="w-full glass-panel border-b border-white/10 relative z-50">
                <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl font-light tracking-[0.2em] text-white">
                            REZGÉS<span className="text-gold font-bold glow-text">KAPU</span>
                        </div>
                        <div className="hidden sm:block text-[10px] tracking-widest text-brand-blue uppercase ml-4 border-l border-brand-blue/30 pl-4">
                            Esemény Platform
                        </div>
                    </div>
                    <HeaderActions />
                </div>
            </header>

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
                    <HomeEventList initialEvents={publicEvents} categories={categories} />
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