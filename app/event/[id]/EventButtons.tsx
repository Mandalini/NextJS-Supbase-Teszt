'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EventButtons({ eventId }: { eventId: string }) {
    const [copied, setCopied] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isAttending, setIsAttending] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // Ellenőrizzük, részt vesz-e
                const { data, error } = await supabase
                    .from('event_attendees')
                    .select('id')
                    .eq('event_id', eventId)
                    .eq('user_id', user.id)
                    .single();

                if (data && !error) {
                    setIsAttending(true);
                }
            }
            setLoading(false);
        };
        checkStatus();
    }, [eventId]);

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleRsvp = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert("Kérlek, jelentkezz be a részvétel jelzéséhez!");
            return;
        }

        const oldStatus = isAttending;
        setIsAttending(!oldStatus);

        if (oldStatus) {
            // Törlés
            const { error } = await supabase
                .from('event_attendees')
                .delete()
                .eq('event_id', eventId)
                .eq('user_id', user.id);

            if (error) {
                console.error(error);
                setIsAttending(oldStatus);
            } else {
                window.dispatchEvent(new Event('rsvpChanged'));
            }
        } else {
            // Hozzáadás extra adatokkal (email, név, avatar)
            const { error } = await supabase
                .from('event_attendees')
                .insert([{
                    event_id: eventId,
                    user_id: user.id,
                    user_email: user.email,
                    user_display_name: user.user_metadata?.display_name || null,
                    user_avatar_url: user.user_metadata?.avatar_url || null
                }]);

            if (error) {
                console.error(error);
                setIsAttending(oldStatus);
            } else {
                window.dispatchEvent(new Event('rsvpChanged'));
            }
        }
    };

    return (
        <div className="mt-16 pt-10 border-t border-white/10 flex flex-col sm:flex-row gap-4 items-center justify-center">
            {/* Részt veszek */}
            <button
                className={`text-white font-extrabold px-10 py-4 rounded-xl relative overflow-hidden group uppercase tracking-widest text-sm w-full sm:w-auto transition-all duration-300 ${isAttending
                    ? 'bg-transparent border border-gold text-gold hover:bg-gold/10'
                    : 'bg-gradient-to-r from-brand-blue to-brand-purple shadow-[0_0_20px_var(--color-brand-blue)] hover:shadow-[0_0_30px_var(--color-brand-blue)] hover:-translate-y-1'
                    } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={toggleRsvp}
                disabled={loading}
            >
                {!isAttending && <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>}
                {loading ? 'Betöltés...' : isAttending ? '✓ Részt veszel' : 'Részt Veszek'}
            </button>

            {/* Link másolása gomb */}
            <button
                onClick={handleCopy}
                className={`bg-transparent border ${copied ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-white/20 text-white hover:bg-white/10'} px-10 py-4 rounded-xl transition-all uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-3 w-full sm:w-auto`}
            >
                <span>{copied ? '✅' : '🔗'}</span> {copied ? 'Másolva!' : 'Link másolása'}
            </button>
        </div>
    );
}
