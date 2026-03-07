import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';

// Ehhez a publikus URL oldalhoz nem nyitunk adatbázis kapcsolatot a klienstől, 
// hanem generáljuk szerver-oldalon a Next.js App Routerrel.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function OrganizerPage({ params }: { params: { id: string } }) {
    // 1. Profil lekérdezése
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
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
        .eq('user_id', params.id)
        .eq('status', 'published')
        .order('date', { ascending: true });

    return (
        <div className="min-h-screen bg-[#070707] pb-20">
            {/* Fejléc / Borítókép-szerű sáv */}
            <div className="h-64 md:h-80 w-full bg-gradient-to-br from-brand-blue/20 via-brand-purple/20 to-black relative overflow-hidden flex items-end justify-center pb-16">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
                <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-[#070707] to-transparent"></div>

                {/* Profilkép */}
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#070707] bg-gradient-to-tr from-brand-blue to-brand-purple absolute -bottom-16 md:-bottom-20 shadow-2xl flex items-center justify-center overflow-hidden z-10 group">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.display_name || 'Szervező'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                        <span className="text-5xl font-bold text-white">{(profile.display_name || '?').charAt(0).toUpperCase()}</span>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 pt-24 md:pt-28 text-center relative z-20">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">{profile.display_name || 'Névtelen Szervező'}</h1>

                {profile.slogan && (
                    <p className="text-xl md:text-2xl font-light text-brand-blue/90 max-w-2xl mx-auto mb-8 tracking-wide">
                        "{profile.slogan}"
                    </p>
                )}

                {/* Social & Contact gombok */}
                <div className="flex flex-wrap justify-center gap-4 mb-16">
                    {profile.phone && (
                        <a href={`tel:${profile.phone}`} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-bold text-gray-300 hover:text-white transition-all">
                            <span>📞</span> {profile.phone}
                        </a>
                    )}
                    {profile.website && (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue/10 hover:bg-brand-blue/20 border border-brand-blue/30 rounded-full text-sm font-bold text-brand-blue hover:text-white transition-all">
                            <span>🌐</span> Weboldal
                        </a>
                    )}
                    {profile.facebook && (
                        <a href={profile.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 rounded-full text-sm font-bold text-[#1877F2] hover:text-white transition-all">
                            <span>f</span> Facebook
                        </a>
                    )}
                    {profile.instagram && (
                        <a href={profile.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-[#FD1D1D]/10 to-[#C13584]/10 hover:from-[#FD1D1D]/20 hover:to-[#C13584]/20 border border-[#C13584]/30 rounded-full text-sm font-bold text-[#E1306C] hover:text-white transition-all">
                            <span>📸</span> Instagram
                        </a>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-left">
                    {/* Bemutatkozás (HTML formázott Quill tartalom) */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-2xl">📝</span>
                            <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Bemutatkozás</h2>
                        </div>

                        {profile.introduction ? (
                            <div className="prose prose-invert prose-brand prose-p:text-gray-400 prose-a:text-brand-blue hover:prose-a:text-brand-purple prose-headings:text-white max-w-none bg-white/5 p-8 rounded-3xl border border-white/5"
                                dangerouslySetInnerHTML={{ __html: profile.introduction }}
                            />
                        ) : (
                            <p className="text-gray-500 italic bg-white/5 p-8 rounded-3xl border border-white/5">A szervező még nem írt bemutatkozást.</p>
                        )}
                    </div>

                    {/* Szervező eseményei */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-2xl">🎟️</span>
                            <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Események ({events?.length || 0})</h2>
                        </div>

                        <div className="space-y-4">
                            {events && events.length > 0 ? (
                                events.map(event => (
                                    <Link href={`/event/${event.id}`} key={event.id} className="block group">
                                        <div className="bg-white/5 hover:bg-white/10 border border-white/5 group-hover:border-brand-blue/30 p-5 rounded-2xl transition-all duration-300">
                                            <div className="text-xs font-bold text-brand-purple uppercase tracking-widest mb-1">
                                                {new Date(event.date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-brand-blue transition-colors line-clamp-2">{event.title}</h3>
                                            <div className="text-gray-400 text-sm mt-2 flex items-center gap-1">
                                                <span>📍</span> {event.location || 'Helyszín később'}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-gray-500 italic bg-white/5 p-6 rounded-2xl border border-white/5">Nincsenek aktuális események.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
