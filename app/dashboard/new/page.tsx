"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
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

export default function NewEventPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Aktuális felhasználó lekérése
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert("Nem vagy bejelentkezve!");
            setLoading(false);
            return;
        }

        // Kép feltöltése, ha van
        let image_url = null;
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('event-images')
                .upload(filePath, imageFile);

            if (uploadError) {
                console.error("Hiba a kép feltöltésekor:", uploadError);
                alert("Hiba történt a kép feltöltésekor.");
            } else {
                const { data: publicUrlData } = supabase.storage
                    .from('event-images')
                    .getPublicUrl(filePath);
                image_url = publicUrlData.publicUrl;
            }
        }

        // Adat beszúrása a Supabase-be
        const { error } = await supabase
            .from('events')
            .insert([
                {
                    title: formData.title,
                    date: formData.date,
                    location: formData.location,
                    description: formData.description,
                    category: formData.category,
                    is_public: formData.status === 'published',
                    status: formData.status,
                    user_id: user.id,
                    image_url: image_url,
                    updated_at: new Date().toISOString(),
                    updated_by: user.id
                }
            ]);

        setLoading(false);

        if (error) {
            console.error("Hiba történt:", error);
            alert("Hiba történt az esemény mentésekor.");
        } else {
            // Sikeres mentés után visszairányítjuk a dashboardra
            router.push('/dashboard');
        }
    };

    return (
        <div className="min-h-screen p-8 max-w-3xl mx-auto flex flex-col justify-center">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-extralight text-white">ÚJ <span className="text-gold font-bold glow-text">ESEMÉNY</span></h1>
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
                    </select>
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Borítókép</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                setImageFile(e.target.files[0]);
                            }
                        }}
                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-blue/20 file:text-brand-blue hover:file:bg-brand-blue/30 transition-all cursor-pointer"
                    />
                </div>

                <div className="pt-8 flex flex-col sm:flex-row gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-brand-blue to-brand-purple text-white font-extrabold px-6 py-3 rounded-xl shadow-[0_0_15px_var(--color-brand-blue)] hover:shadow-[0_0_25px_var(--color-brand-blue)] transition-all duration-300 disabled:opacity-50 uppercase tracking-widest text-sm"
                    >
                        {loading ? 'Mentés...' : 'Esemény mentése'}
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