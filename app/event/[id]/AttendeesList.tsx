'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AttendeesList({ eventId }: { eventId: string }) {
    const [attendees, setAttendees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAttendees = async () => {
        const { data, error } = await supabase
            .from('event_attendees')
            .select('user_email, user_display_name, created_at')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setAttendees(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAttendees();

        // Feliratkozás az élő adatbázis-változásokra
        const channel = supabase
            .channel('public:event_attendees')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'event_attendees', filter: `event_id=eq.${eventId}` },
                () => {
                    fetchAttendees();
                }
            )
            .subscribe();

        // Rálógatás egyéni 'rsvpChanged' ablak event-re a gomb kattintása miatti azonnali visszacsatolásért
        const handleRsvpChange = () => {
            fetchAttendees();
        };
        window.addEventListener('rsvpChanged', handleRsvpChange);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('rsvpChanged', handleRsvpChange);
        };
    }, [eventId]);

    if (loading) {
        return <div className="text-gray-500 text-sm mt-8 animate-pulse">Résztvevők betöltése...</div>;
    }

    return (
        <div className="mt-12 bg-black/20 border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm text-gold uppercase tracking-widest mb-6 font-bold flex items-center gap-3">
                <span className="text-xl">👥</span>
                Résztvevők ({attendees.length})
            </h3>

            {attendees.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                    {attendees.map((att, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs text-gray-300 font-medium flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#5b42ff] to-[#9d4edd] flex items-center justify-center text-white font-bold text-[10px]">
                                {att.user_display_name ? att.user_display_name.charAt(0).toUpperCase() : att.user_email?.charAt(0).toUpperCase() || '?'}
                            </div>
                            {att.user_display_name || att.user_email?.split('@')[0]}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 text-xs italic">Még senki nem jelezte részvételét. Légy te az első!</p>
            )}
        </div>
    );
}
