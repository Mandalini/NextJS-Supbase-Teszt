"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePermissions } from '@/app/hooks/usePermissions';

export default function CategoriesPage() {
    const router = useRouter();
    const { loading: permsLoading, permissions: userPermissions } = usePermissions();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        if (permsLoading) return;

        const canManage = userPermissions.some((p: any) => p.action === 'manage_categories');
        if (!canManage) {
            router.push('/dashboard');
            return;
        }
        fetchCategories();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permsLoading, userPermissions, router]);

    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (error) {
            console.error(error);
        } else {
            setCategories(data || []);
        }
        setLoading(false);
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim() }]);
        if (error) {
            if (error.code === '23505') {
                alert('Ez a kategória már létezik.');
            } else {
                alert('Hiba történt a mentéskor.');
            }
        } else {
            setNewCategoryName('');
            fetchCategories();
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase.from('categories').update({ is_active: !currentStatus }).eq('id', id);
        if (error) {
            alert('Hiba az állapot módosításakor.');
        } else {
            fetchCategories();
        }
    };

    const handleDelete = async (id: string, name: string) => {
        // Ellenőrizzük, hogy használatban van-e a név alapján
        const { count, error: countError } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('category', name);

        if (countError) {
            alert('Hiba az ellenőrzés során.');
            return;
        }

        if (count && count > 0) {
            alert(`Nem törölhető! Ezt a kategóriát ${count} esemény használja.`);
            return;
        }

        if (confirm(`Biztosan törlöd ezt a kategóriát: ${name}?`)) {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) {
                alert('Hiba a törlés során.');
            } else {
                fetchCategories();
            }
        }
    };

    if (permsLoading || loading) {
        return <div className="p-8 text-center text-gray-500 glow-text min-h-screen flex items-center justify-center">Kategóriák betöltése...</div>;
    }

    const canManageCategories = userPermissions.some((p: any) => p.action === 'manage_categories');
    if (!canManageCategories) {
        return null;
    }

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen text-white">
            <div className="flex flex-col mb-10 gap-4">
                <Link href="/dashboard" className="text-brand-blue hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-4 inline-block flex items-center gap-2">
                    <span className="text-lg">&larr;</span> Vissza a Vezérlőpultra
                </Link>
                <h1 className="text-4xl font-extralight tracking-wider">KATEGÓRIÁK <span className="text-gold font-bold glow-text">KEZELÉSE</span></h1>
                <p className="text-gray-400 text-sm font-light">
                    Itt kezelheted az eseményeknél választható kategóriákat. A használt kategóriák nem törölhetők, de inaktiválhatók.
                </p>
            </div>

            <form onSubmit={handleAddCategory} className="mb-10 glass-panel p-6 rounded-2xl glow-border flex flex-col sm:flex-row items-end gap-4 relative z-10">
                <div className="flex-grow w-full">
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Új kategória neve</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Pl. Hangfürdő"
                    />
                </div>
                <button
                    type="submit"
                    className="bg-brand-blue text-white w-full sm:w-auto px-8 py-3 rounded-xl uppercase tracking-widest text-xs font-bold shadow-[0_0_10px_var(--color-brand-blue)] hover:shadow-[0_0_20px_var(--color-brand-blue)] transition-all"
                >
                    Hozzáadás
                </button>
            </form>

            <div className="glass-panel rounded-2xl glow-border overflow-hidden">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-black/20">
                        <tr>
                            <th className="px-6 py-4 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px]">Kategória Név</th>
                            <th className="px-6 py-4 text-center font-bold text-brand-blue uppercase tracking-widest text-[10px]">Állapot</th>
                            <th className="px-6 py-4 text-right font-bold text-brand-blue uppercase tracking-widest text-[10px]">Műveletek</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={3} className="p-8 text-center text-gray-400 font-mono text-xs">A kategóriák betöltése folyamatban...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-gray-400 font-mono text-xs">Még nincsenek felvéve kategóriák.</td></tr>
                        ) : (
                            categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-bold text-white text-base">{cat.name}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleToggleActive(cat.id, cat.is_active)}
                                            className={`px-3 py-1.5 rounded-full text-[9px] uppercase tracking-widest font-bold transition-all shadow-sm ${cat.is_active
                                                ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/50 hover:bg-brand-blue/30'
                                                : 'bg-gray-800 text-gray-500 border border-gray-600 hover:text-gray-300'
                                                }`}
                                        >
                                            {cat.is_active ? 'Aktiválva' : 'Inaktiválva'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(cat.id, cat.name)}
                                            className="text-red-400 hover:text-red-300 font-bold uppercase tracking-widest text-[10px] transition-colors bg-red-500/10 px-3 py-1.5 rounded border border-red-500/20 hover:bg-red-500/20"
                                        >
                                            Törlés
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
