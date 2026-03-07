"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// React (uses), hogy kibontsuk a params Promise-t Next 15 szerint:
import { use } from 'react';
import { CustomDateInput, CustomCategorySelect } from '@/app/components/FormControls';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link'],
        ['clean']
    ]
};

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [existingImage, setExistingImage] = useState<string | null>(null);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('name');
            if (data) setCategories(data);
        };
        fetchCategories();
    }, []);

    const [formData, setFormData] = useState({
        title: '',
        date: '',
        location: '',
        description: '',
        category: 'Egyéb',
        is_public: false,
        status: 'draft',
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
                setExistingImage(data.image_url || null);
                setFormData({
                    title: data.title || '',
                    date: data.date ? data.date.split('T')[0] : '',
                    location: data.location || '',
                    description: data.description || '',
                    category: data.category || 'Egyéb',
                    is_public: data.is_public || false,
                    status: data.status || 'draft',
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

        let final_image_url = existingImage;

        // Ha új képet töltött fel a felhasználó
        if (imageFile) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('event-images')
                    .upload(filePath, imageFile);

                if (uploadError) {
                    console.error("Hiba a kép feltöltésekor:", uploadError);
                    alert("Hiba történt a kép feltöltésekor.");
                    setLoading(false);
                    return;
                } else {
                    const { data: publicUrlData } = supabase.storage
                        .from('event-images')
                        .getPublicUrl(filePath);
                    final_image_url = publicUrlData.publicUrl;
                }
            }
        }

        // Adat frissítése a Supabase-ben
        const { error } = await supabase
            .from('events')
            .update({
                title: formData.title,
                date: formData.date,
                location: formData.location,
                description: formData.description,
                category: formData.category,
                is_public: formData.status === 'published',
                status: formData.status,
                image_url: final_image_url
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
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-extralight text-white">ESEMÉNY <span className="text-gold font-bold glow-text">SZERKESZTÉSE</span></h1>
                <Link
                    href="/dashboard"
                    className="px-5 py-2.5 glass-panel text-white hover:bg-white/10 rounded-xl transition-all glow-border text-[10px] uppercase tracking-widest font-bold flex items-center gap-2"
                >
                    <span>&larr;</span> Vissza a Vezérlőpultra
                </Link>
            </div>

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

                <div className="relative">
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Dátum *</label>
                    <CustomDateInput
                        value={formData.date}
                        onChange={(val) => setFormData({ ...formData, date: val })}
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

                <div className="relative z-40">
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Kategória</label>
                    <CustomCategorySelect
                        value={formData.category}
                        onChange={(val) => setFormData({ ...formData, category: val })}
                        categories={categories}
                    />
                </div>

                <div className="text-white">
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Leírás</label>
                    <div className="bg-black/40 rounded-xl overflow-hidden border border-white/20 focus-within:border-gold focus-within:ring-1 focus-within:ring-gold transition-colors">
                        <ReactQuill
                            theme="snow"
                            modules={QUILL_MODULES}
                            value={formData.description}
                            onChange={(content) => setFormData({ ...formData, description: content })}
                            className="text-white min-h-[200px]"
                        />
                    </div>
                </div>

                <div className="flex flex-col mt-4 bg-black/20 p-4 rounded-xl border border-white/5">
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Státusz (Draft/Publikált)</label>
                    <select
                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-colors font-bold tracking-widest"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                        <option value="draft" className="bg-gray-900 text-gray-400">Piszkozat (Draft) - Rejtett</option>
                        <option value="published" className="bg-gray-900 text-brand-blue font-bold">Publikálva - Látható mindenkinek</option>
                        <option value="cancelled" className="bg-gray-900 text-red-500">Törölt / Elmarad</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Borítókép</label>
                    {existingImage && (
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-2">Jelenlegi kép:</p>
                            <img src={existingImage} alt="Esemény borító" className="w-full max-w-sm h-48 object-cover rounded-xl border border-white/20" />
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                setImageFile(e.target.files[0]);
                                // Opcionális: a feltöltés gomb megnyomásakor már a feltöltött lesz látható ideiglenesen
                            }
                        }}
                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-blue/20 file:text-brand-blue hover:file:bg-brand-blue/30 transition-all cursor-pointer mt-2"
                    />
                    {imageFile && <p className="text-xs text-gold mt-2">Új kép kiválasztva cserére: {imageFile.name}</p>}
                </div>

                <div className="pt-8 flex flex-col sm:flex-row gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-gold to-yellow-600 text-black font-extrabold px-6 py-3 rounded-xl hover:shadow-[0_0_20px_var(--color-gold)] transition-all duration-300 disabled:opacity-50 uppercase tracking-widest text-sm"
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
