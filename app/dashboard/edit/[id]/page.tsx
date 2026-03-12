"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// React (uses), hogy kibontsuk a params Promise-t Next 15 szerint:
import { use } from 'react';
import { CustomDateInput, CustomCategorySelect } from '@/app/components/FormControls';
import { usePermissions } from '@/app/hooks/usePermissions';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import SyncTasksTable from '@/app/components/SyncTasksTable';

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
    const { hasPermission } = usePermissions();

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
        event_time: '',
        price: '',
        capacity: '',
        location: '',
        description: '',
        category: 'Egyéb',
        is_public: false,
        status: 'draft',
        owner_name: '',
        modifier_name: '',
        updated_at: '',
        created_at: '',
    });

    useEffect(() => {
        const fetchEvent = async () => {
            const id = params?.id;
            if (!id || typeof id !== 'string') return;

            const { data, error } = await supabase
                .from('events')
                .select('*, owner:profiles!events_user_id_fkey(display_name), modifier:profiles!events_updated_by_fkey(display_name)')
                .eq('id', id)
                .single();

            if (error || !data) {
                console.error("Hiba az esemény betöltésekor:", JSON.stringify(error));
                alert("Nem sikerült betölteni az eseményt.");
                router.push('/dashboard');
            } else {
                setExistingImage(data.image_url || null);
                setFormData({
                    title: data.title || '',
                    date: data.date ? data.date.split('T')[0] : '',
                    event_time: data.event_time ? data.event_time.substring(0, 5) : '',
                    price: data.price ? data.price.toString() : '',
                    capacity: data.capacity ? data.capacity.toString() : '',
                    location: data.location || '',
                    description: data.description || '',
                    category: data.category || 'Egyéb',
                    is_public: data.is_public || false,
                    status: data.status || 'draft',
                    owner_name: data.owner?.display_name || 'Ismeretlen',
                    modifier_name: data.modifier?.display_name || 'Sosem módosítva',
                    updated_at: data.updated_at || '',
                    created_at: data.created_at || '',
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updateData = {
            ...formData,
            image_url: final_image_url,
            is_public: formData.status === 'published',
            updated_at: new Date().toISOString(),
            updated_by: user.id
        };

        // Remove UI-only fields from database update
        const { owner_name, modifier_name, created_at, ...dbData } = updateData;

        const finalDbData = {
            ...dbData,
            event_time: dbData.event_time || null,
            price: dbData.price ? parseFloat(dbData.price as string) : null,
            capacity: dbData.capacity ? parseInt(dbData.capacity as string, 10) : null
        };

        const { error } = await supabase
            .from('events')
            .update(finalDbData)
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

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Időpont</label>
                        <input
                            type="time"
                            className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors [color-scheme:dark]"
                            value={formData.event_time}
                            onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Részvételi díj (HUF)</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors [color-scheme:dark]"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Férőhely (fő)</label>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors [color-scheme:dark]"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        />
                    </div>
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

                <div className="bg-black/40 border border-white/10 rounded-xl p-6 flex flex-col gap-4 text-xs font-mono tracking-widest uppercase">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-gray-500">Létrehozó:</span>
                        <span className="text-brand-blue font-bold">{formData.owner_name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-gray-500">Létrehozva:</span>
                        <span className="text-white">{formData.created_at ? new Date(formData.created_at).toLocaleString('hu-HU') : '-'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-gray-500">Utolsó módosító:</span>
                        <span className="text-gold font-bold">{formData.modifier_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Utolsó módosítás:</span>
                        <span className="text-white">{formData.updated_at ? new Date(formData.updated_at).toLocaleString('hu-HU') : '-'}</span>
                    </div>
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
            </form >

            {/* Szinkronizálási vezérlő */}
            {(hasPermission('view_sync_rules') || hasPermission('manage_sync_rules')) && (
                <div className="glass-panel p-6 rounded-2xl glow-border mt-8">
                    <h3 className="text-xl font-bold uppercase tracking-widest text-brand-blue mb-4">Külső Szinkronizálás Célpontjai</h3>
                    <p className="text-gray-400 text-xs mb-4">Itt állíthatod be, hogy ezt az eseményt mely külső rendszerekbe kell szinkronizálni, és nyomon követheted azok állapotát.</p>
                    <div className="bg-black/40 rounded-xl overflow-hidden border border-white/10 p-2 md:p-4">
                        <SyncTasksTable 
                            fixedTargetType="Esemény" 
                            fixedTargetId={params?.id as string} 
                            readonly={!hasPermission('manage_sync_rules')}
                        />
                    </div>
                </div>
            )}

        </div >
    );
}
