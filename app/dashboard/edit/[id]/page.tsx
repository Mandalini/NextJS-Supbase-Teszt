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
        return <div className="p-8 text-center text-gray-500">Adatok betöltése...</div>;
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Esemény szerkesztése</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Cím *</label>
                    <input
                        type="text"
                        required
                        className="w-full border rounded p-2"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Dátum *</label>
                    <input
                        type="date"
                        required
                        className="w-full border rounded p-2"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Helyszín</label>
                    <input
                        type="text"
                        className="w-full border rounded p-2"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Leírás</label>
                    <textarea
                        className="w-full border rounded p-2"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                </div>

                <div className="flex items-center mt-4">
                    <input
                        type="checkbox"
                        id="is_public"
                        className="mr-2 w-4 h-4"
                        checked={formData.is_public}
                        onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    />
                    <label htmlFor="is_public">Publikus esemény (mások is láthatják)</label>
                </div>

                <div className="pt-6 flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-yellow-500 text-white px-6 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
                    >
                        {loading ? 'Mentés...' : 'Változtatások mentése'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
                    >
                        Mégse
                    </button>
                </div>
            </form>
        </div>
    );
}
