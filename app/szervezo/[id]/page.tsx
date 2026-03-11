import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import BackButton from '@/app/components/BackButton';

// Ehhez a publikus URL oldalhoz nem nyitunk adatbázis kapcsolatot a klienstől, 
// hanem generáljuk szerver-oldalon a Next.js App Routerrel.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function OrganizerPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // 1. Profil lekérdezése
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('is_public', true) // Csak a publikus profilokat mutatjuk!
        .single();

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center p-4">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-4">Profil Nem Található</h1>
                    <p className="text-gray-400 mb-8">Ez a szervező nem létezik, vagy a profilja jelenleg privátra van állítva.</p>
                    <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 glass-panel text-white hover:bg-white/10 rounded-xl transition-all glow-border text-[10px] uppercase tracking-widest font-bold">
                        <span>&larr;</span> Vissza a Főoldalra
                    </Link>
                </div>
            </div>
        );
    }

    // 2. Szervező eseményeinek lekérdezése (csak a publikáltak)
    const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', id)
        .eq('status', 'published')
        .order('date', { ascending: true });

    return (
        <div className="min-h-screen flex flex-col items-center bg-[var(--color-background)] text-gray-300">
            {/* Fejléc */}
            <header className="w-full glass-panel border-b border-white/10 relative z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="text-xl font-light tracking-[0.2em] text-white group-hover:text-brand-blue transition-colors">
                            REZGÉS<span className="text-gold font-bold glow-text">KAPU</span>
                        </div>
                    </Link>
                    <nav>
                        <BackButton />
                    </nav>
                </div>
            </header>

            {/* Fő tartalom */}
            <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-8 relative z-10">
                <div className="glass-panel p-6 md:p-8 rounded-3xl glow-border shadow-2xl relative overflow-hidden">

                    {/* Háttér dekokráció hópelyhek / csillagok glow illúzió */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>

                    {/* Borítókép-szerű sáv / Kép */}
                    {profile.avatar_url ? (
                        <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden mb-8 relative border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                            <img src={profile.avatar_url} alt={profile.display_name || 'Szervező'} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-background)]/80 via-transparent to-transparent"></div>
                        </div>
                    ) : (
                        <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-8 relative flex items-center justify-center bg-gradient-to-tr from-brand-blue to-brand-purple shadow-2xl border border-white/10">
                            <span className="text-8xl font-bold text-white">{(profile.display_name || '?').charAt(0).toUpperCase()}</span>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-white/10 pb-8 mb-8">
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-4xl font-extralight text-white leading-tight mb-2">
                                {profile.display_name || 'Névtelen Szervező'}
                            </h1>
                            {profile.slogan && (
                                <p className="text-lg font-light text-brand-blue/90 max-w-2xl tracking-wide mb-4">
                                    "{profile.slogan}"
                                </p>
                            )}
                        </div>

                        {/* Kapcsolat / Sidebar */}
                        <div className="md:w-64 flex-shrink-0 bg-black/40 border border-white/10 rounded-2xl p-5 shadow-inner backdrop-blur-md">
                            <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Kapcsolat</h3>

                            {profile.phone && (
                                <div className="flex items-start gap-2 mt-3">
                                    <span className="text-gray-400 text-base mt-0.5">📞</span>
                                    <div>
                                        <a href={`tel:${profile.phone}`} className="text-white text-xs font-bold hover:text-gold transition-colors">{profile.phone}</a>
                                    </div>
                                </div>
                            )}

                            {profile.website && (
                                <div className="flex items-start gap-2 mt-4">
                                    <span className="text-brand-blue text-base mt-0.5">🌐</span>
                                    <div>
                                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-white text-xs font-bold hover:text-brand-blue transition-colors break-words">Weboldal</a>
                                    </div>
                                </div>
                            )}

                            {profile.facebook && (
                                <div className="flex items-start gap-2 mt-4">
                                    <span className="text-[#1877F2] text-base mt-0.5">f</span>
                                    <div>
                                        <a href={profile.facebook} target="_blank" rel="noopener noreferrer" className="text-white text-xs font-bold hover:text-[#1877F2] transition-colors">Facebook</a>
                                    </div>
                                </div>
                            )}

                            {profile.instagram && (
                                <div className="flex items-start gap-2 mt-4">
                                    <span className="text-[#E1306C] text-base mt-0.5">📸</span>
                                    <div>
                                        <a href={profile.instagram} target="_blank" rel="noopener noreferrer" className="text-white text-xs font-bold hover:text-[#E1306C] transition-colors">Instagram</a>
                                    </div>
                                </div>
                            )}

                            {!profile.phone && !profile.website && !profile.facebook && !profile.instagram && (
                                <p className="text-gray-600 font-light italic text-xs mt-2">Nincs megadva kapcsolat.</p>
                            )}
                        </div>
                    </div>

                    {/* Bemutatkozás (HTML formázott Quill tartalom) */}
                    <div>
                        <h2 className="text-xs text-gold uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
                            <span className="w-6 h-[1px] bg-gold block"></span>
                            Bemutatkozás
                        </h2>
                        {profile.introduction ? (
                            <div className="prose prose-invert prose-brand prose-p:text-gray-300 prose-a:text-brand-blue hover:prose-a:text-brand-purple prose-headings:text-white max-w-none text-lg font-light leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: profile.introduction }}
                            />
                        ) : (
                            <p className="text-gray-600 font-light italic">A szervező még nem írt bemutatkozást.</p>
                        )}
                    </div>

                    {/* Szervező eseményei */}
                    <div className="mt-12">
                        <h2 className="text-xs text-brand-purple uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
                            <span className="w-6 h-[1px] bg-brand-purple block"></span>
                            Események ({events?.length || 0})
                        </h2>

                        <div className="grid gap-4 md:grid-cols-2">
                            {events && events.length > 0 ? (
                                events.map(event => (
                                    <Link href={`/event/${event.id}`} key={event.id} className="block group">
                                        <div className="bg-white/5 hover:bg-white/10 border border-white/5 group-hover:border-brand-blue/30 p-5 rounded-2xl transition-all duration-300 shadow-lg">
                                            <div className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <span>📅</span>
                                                {new Date(event.date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                {event.event_time && (
                                                    <span className="flex items-center gap-1 ml-2 text-brand-purple">
                                                        <span>🕒</span>
                                                        {event.event_time.substring(0, 5)}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-gold transition-colors line-clamp-2">{event.title}</h3>
                                            <div className="text-white/70 text-sm mt-2 flex items-center gap-2 font-mono">
                                                <span className="text-brand-blue filter drop-shadow-[0_0_5px_rgba(0,194,255,0.4)]">📍</span> {event.location || 'Helyszín később'}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-gray-600 font-light italic col-span-full">Nincsenek aktuális események.</p>
                            )}
                        </div>
                    </div>

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
