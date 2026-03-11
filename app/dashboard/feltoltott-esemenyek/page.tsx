'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePermissions } from '@/app/hooks/usePermissions';
import EditableTable from '@/app/components/EditableTable';

export default function FeltoltottEsemenyekPage() {
    const router = useRouter();
    const { loading: permsLoading, permissions: userPermissions } = usePermissions();
    const [scrapeSources, setScrapeSources] = useState<any[]>([]);
    const [soundbathEvents, setSoundbathEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (permsLoading) return;

        const canView = userPermissions.some((p: any) => p.action === 'view_uploaded_events');
        if (!canView) {
            router.push('/dashboard');
            return;
        }
        fetchAllData();
    }, [permsLoading, userPermissions, router]);

    const fetchAllData = async () => {
        setLoading(true);
        
        const [sourcesRes, eventsRes] = await Promise.all([
            supabase.from('scrape_sources').select('*').order('source_key'),
            supabase.from('soundbath_events').select('*').order('event_date').order('start_time')
        ]);

        if (sourcesRes.error) console.error('Error fetching sources:', sourcesRes.error);
        if (eventsRes.error) console.error('Error fetching events:', eventsRes.error);

        setScrapeSources(sourcesRes.data || []);
        setSoundbathEvents(eventsRes.data || []);
        setLoading(false);
    };

    const handleSaveSource = async (row: any) => {
        const { error } = await supabase.from('scrape_sources').update(row).eq('id', row.id);
        if (error) {
            console.error('Error saving source:', error);
            alert('Hiba történt a mentéskor: ' + error.message);
            throw error;
        }
        setScrapeSources(prev => prev.map(s => s.id === row.id ? row : s));
    };

    const handleDeleteSource = async (id: string | number) => {
        if (!confirm('Biztosan törölni szeretnéd ezt a forrást?')) return;
        const { error } = await supabase.from('scrape_sources').delete().eq('id', id);
        if (error) {
            console.error('Error deleting source:', error);
            alert('Hiba történt a törléskor: ' + error.message);
            throw error;
        }
        setScrapeSources(prev => prev.filter(s => s.id !== id));
    };

    const handleSaveEvent = async (row: any) => {
        const { error } = await supabase.from('soundbath_events').update(row).eq('id', row.id);
        if (error) {
            console.error('Error saving event:', error);
            alert('Hiba történt a mentéskor: ' + error.message);
            throw error;
        }
        setSoundbathEvents(prev => prev.map(e => e.id === row.id ? row : e));
    };

    const handleDeleteEvent = async (id: string | number) => {
        if (!confirm('Biztosan törölni szeretnéd ezt az eseményt?')) return;
        const { error } = await supabase.from('soundbath_events').delete().eq('id', id);
        if (error) {
            console.error('Error deleting event:', error);
            alert('Hiba történt a törléskor: ' + error.message);
            throw error;
        }
        setSoundbathEvents(prev => prev.filter(e => e.id !== id));
    };

    const sourceColumns = [
        { key: 'source_key', label: 'Key', editable: true, width: 120 },
        { key: 'source_url', label: 'URL', editable: true, width: 250 },
        { key: 'parser_type', label: 'Parser', editable: true, width: 120 },
        { key: 'status', label: 'Status', editable: true, width: 100 },
        { key: 'is_active', label: 'Aktív', editable: true, type: 'boolean' as const, width: 80 },
        { key: 'last_scraped_at', label: 'Utoljára', width: 180 },
    ];

    const eventColumns = [
        { key: 'event_date', label: 'Dátum', editable: true, type: 'date' as const, width: 120 },
        { key: 'start_time', label: 'Start', editable: true, type: 'time' as const, width: 90 },
        { key: 'title', label: 'Cím', editable: true, width: 250 },
        { key: 'is_active', label: 'Aktív', editable: true, type: 'boolean' as const, width: 80 },
        { key: 'download_date', label: 'Letöltve', width: 120 },
        { key: 'event_url', label: 'Event URL', width: 200 },
        { key: 'source_key', label: 'Source', editable: true, width: 120 },
        { key: 'source_url', label: 'Source URL', width: 200 },
        { key: 'inserted_at', label: 'Bekerült', width: 180 },
    ];

    const groupedEvents = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        soundbathEvents.forEach(event => {
            const key = `${event.source_key} | ${event.is_active ? 'Aktív' : 'Inaktív'}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(event);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [soundbathEvents]);

    if (permsLoading || loading) {
        return <div className="p-8 text-center text-gray-500 glow-text min-h-screen flex items-center justify-center">Adatok betöltése...</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen text-white">
            <div className="flex flex-col mb-10 gap-4">
                <Link href="/dashboard" className="self-start px-5 py-2.5 glass-panel text-white hover:bg-white/10 rounded-xl transition-all glow-border text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 mb-4">
                    <span>&larr;</span> Vissza a Vezérlőpultra
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extralight tracking-wider">FELTÖLTÖTT <span className="text-gold font-bold glow-text">ESEMÉNYEK</span></h1>
                        <p className="text-gray-400 text-sm font-light mt-2">
                            A scrape_sources és soundbath_events táblák adatainak kezelése.
                        </p>
                    </div>
                </div>
            </div>

            {/* SCRAPE SOURCES SECTION */}
            <section className="mb-16">
                <h2 className="text-xl font-bold text-brand-blue uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="text-2xl">🔗</span> Scrape Források
                </h2>
                <EditableTable
                    data={scrapeSources}
                    columns={sourceColumns}
                    onSave={handleSaveSource}
                    onDelete={handleDeleteSource}
                    idField="id"
                    storageKey="scrape_sources"
                    actionsPosition="start"
                    canEdit={userPermissions.some((p: any) => p.action === 'manage_uploaded_events')}
                    canDelete={userPermissions.some((p: any) => p.action === 'manage_uploaded_events')}
                />
            </section>

            {/* SOUNDBATH EVENTS SECTION */}
            <section>
                <h2 className="text-xl font-bold text-brand-purple uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="text-2xl">📅</span> Soundbath Események
                </h2>
                
                <div className="space-y-12">
                    {groupedEvents.map(([groupKey, events]) => (
                        <div key={groupKey} className="space-y-4">
                            <h3 className="text-sm font-bold text-gold bg-gold/10 px-4 py-2 rounded-lg border border-gold/20 inline-block uppercase tracking-[0.2em] mb-2">
                                {groupKey}
                            </h3>
                            <EditableTable
                                data={events}
                                columns={eventColumns}
                                onSave={handleSaveEvent}
                                onDelete={handleDeleteEvent}
                                idField="id"
                                storageKey={`soundbath_events_${groupKey}`}
                                actionsPosition="start"
                                canEdit={userPermissions.some((p: any) => p.action === 'manage_uploaded_events')}
                                canDelete={userPermissions.some((p: any) => p.action === 'manage_uploaded_events')}
                            />
                        </div>
                    ))}
                    {groupedEvents.length === 0 && (
                        <div className="glass-panel p-12 text-center text-gray-500 rounded-2xl border border-dashed border-white/10">
                            Nincs megjeleníthető esemény.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
