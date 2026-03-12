'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/app/hooks/usePermissions';
import EditableTable from '@/app/components/EditableTable';

export default function SyncLocationsPage() {
    const router = useRouter();
    const { loading: permsLoading, permissions: userPermissions } = usePermissions();
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (permsLoading) return;

        const canManage = userPermissions.some((p: any) => p.action === 'manage_sync_rules');
        if (!canManage) {
            router.push('/dashboard');
            return;
        }
        fetchLocations();
    }, [permsLoading, userPermissions, router]);

    const fetchLocations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sync_locations')
            .select('*')
            .order('name');
        
        if (error) {
            console.error('Error fetching sync locations:', JSON.stringify(error));
        } else {
            setLocations(data || []);
        }
        setLoading(false);
    };

    const handleSave = async (row: any) => {
        const { id, created_at, updated_at, ...updateData } = row;
        
        if (id) {
            // Update
            const { error } = await supabase
                .from('sync_locations')
                .update(updateData)
                .eq('id', id);
            
            if (error) {
                console.error('Update error:', JSON.stringify(error));
                alert('Hiba történt a mentés során.');
            }
        } else {
            // Insert
            const { error } = await supabase
                .from('sync_locations')
                .insert([updateData]);
            
            if (error) {
                console.error('Insert error:', JSON.stringify(error));
                alert('Hiba történt a hozzáadás során.');
            }
        }
        fetchLocations();
    };

    const handleDelete = async (id: string | number) => {
        if (!confirm('Biztosan törölni szeretnéd ezt a helyszínt?')) return;
        
        const { error } = await supabase
            .from('sync_locations')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Delete error:', JSON.stringify(error));
            alert('Hiba történt a törlés során.');
        } else {
            fetchLocations();
        }
    };

    const handleAddNew = () => {
        const newLocation = {
            id: '', // temporary empty id to indicate new row
            name: 'Új helyszín',
            url: 'https://',
            status: 'active',
            description: '',
            target_type: 'all',
            secret_key: ''
        };
        setLocations([newLocation, ...locations]);
    };

    const columns: any[] = [
        { 
            key: 'name', 
            label: 'Megnevezés', 
            width: 200, 
            editable: true 
        },
        { 
            key: 'url', 
            label: 'URL', 
            width: 250, 
            editable: true 
        },
        { 
            key: 'status', 
            label: 'Állapot', 
            width: 120, 
            editable: true,
            type: 'select',
            options: [
                { value: 'active', label: 'Aktív' },
                { value: 'inactive', label: 'Inaktív' }
            ],
            render: (val: string) => (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                    val === 'active' 
                        ? 'bg-brand-blue/20 text-brand-blue border-brand-blue/50' 
                        : 'bg-gray-800 text-gray-500 border-gray-600'
                }`}>
                    {val === 'active' ? 'Aktív' : 'Inaktív'}
                </span>
            )
        },
        { 
            key: 'target_type', 
            label: 'Típus', 
            width: 120, 
            editable: true,
            type: 'select',
            options: [
                { value: 'Szervező', label: 'Szervező' },
                { value: 'Esemény', label: 'Esemény' },
                { value: 'all', label: 'Mindkettő' }
            ]
        },
        { 
            key: 'description', 
            label: 'Leírás', 
            width: 300, 
            editable: true 
        },
        { 
            key: 'secret_key', 
            label: 'Titkos kulcs', 
            width: 150, 
            editable: true,
            render: (val: string) => val ? '••••••••' : '-'
        }
    ];

    if (permsLoading || loading) {
        return <div className="p-8 text-center text-gray-500 glow-text min-h-screen flex items-center justify-center">Adatok betöltése...</div>;
    }

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen text-white">
            <div className="flex flex-col mb-10 gap-4">
                <Link href="/dashboard" className="self-start px-5 py-2.5 glass-panel text-white hover:bg-white/10 rounded-xl transition-all glow-border text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 mb-4">
                    <span>&larr;</span> Vissza a Vezérlőpultra
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extralight tracking-wider">SZINKRONIZÁLÁSI <span className="text-gold font-bold glow-text">HELYEK</span></h1>
                        <p className="text-gray-400 text-sm font-light mt-2">
                            Külső weboldalak és szinkronizálási végpontok kezelése.
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative z-0">
                <EditableTable
                    data={locations}
                    columns={columns}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    idField="id"
                    storageKey="sync_locations_table"
                    canEdit={true}
                    canDelete={true}
                    actionsPosition="start"
                    headerActions={
                        <button
                            onClick={handleAddNew}
                            className="bg-brand-blue/20 text-brand-blue border border-brand-blue/50 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest whitespace-nowrap hover:bg-brand-blue/30 transition-all flex items-center gap-1.5 shadow-[0_0_10px_var(--color-brand-blue)]/20"
                        >
                            <span>+</span> Új sor
                        </button>
                    }
                />
            </div>
        </div>
    );
}
