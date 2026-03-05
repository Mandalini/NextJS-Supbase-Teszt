"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// React (uses), hogy kibontsuk a params Promise-t Next 15 szerint:
import { use } from 'react';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState({
        title: '',
        date: '',
        location: '',
        description: '',
        is_public: false,
    });

    useEffect(() => {
        const fetchEvent = async () => {
            const id = params?.id;
            if (!id || typeof id !== 'string') return;

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                console.error("Hiba az esemény betöltésekor:", error);
                alert("Nem sikerült betölteni az eseményt.");
                router.push('/dashboard');
            } else {
                setFormData({
                    title: data.title || '',
                    date: data.date ? data.date.split('T')[0] : '',
                    location: data.location || '',
                    description: data.description || '',
                    is_public: data.is_public || false,
                });
            }
            setFetching(false);
        };

        fetchEvent();
    }, [params, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const id = params?.id;
        if (!id || typeof id !== 'string') return;

        // Adat frissítése a Supabase-ben
        const { error } = await supabase
            .from('events')
            .update({
                title: formData.title,
                date: formData.date,
                location: formData.location,
                description: formData.description,
                is_public: formData.is_public,
            })
            .eq('id', id);

        setLoading(false);

        if (error) {
            console.error("Hiba történt:", error);
            alert("Hiba történt az esemény mentésekor.");
        } else {
            // Sikeres mentés után visszairányítjuk a dashboardra
            router.push('/dashboard');
        }
    };

    if (fetching) {
        return <div className="p-8 text-center text-gray-400 glow-text min-h-screen flex items-center justify-center">Esemény betöltése...</div>;
    }

    return (
        <div className="min-h-screen p-8 max-w-3xl mx-auto flex flex-col justify-center">
            <h1 className="text-4xl font-extralight text-white mb-8">ESEMÉNY <span className="text-gold font-bold glow-text">SZERKESZTÉSE</span></h1>

            <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl glow-border space-y-6 transition-all duration-300">
                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Cím *</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Dátum *</label>
                    <input
                        type="date"
                        required
                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Helyszín</label>
                    <input
                        type="text"
                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Leírás</label>
                    <textarea
                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                </div>

                <div className="flex items-center mt-4 bg-black/20 p-4 rounded-xl border border-white/5">
                    <input
                        type="checkbox"
                        id="is_public"
                        className="mr-3 w-5 h-5 accent-[#5b42ff] rounded border-white/20 cursor-pointer"
                        checked={formData.is_public}
                        onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    />
                    <label htmlFor="is_public" className="text-sm font-medium text-gray-300 cursor-pointer select-none">Publikus esemény (megjelenik a kezdőlapon)</label>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-gold to-yellow-600 text-black font-extrabold px-6 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(255,193,7,0.5)] transition-all duration-300 disabled:opacity-50 uppercase tracking-widest text-sm"
                    >
                        {loading ? 'Mentés...' : 'Változtatások mentése'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        className="flex-1 bg-transparent border border-white/20 text-white hover:bg-white/10 px-6 py-3 rounded-xl transition-all uppercase tracking-widest text-sm font-bold"
                    >
                        Mégse
                    </button>
                </div>
            </form>
        </div>
    );
}
