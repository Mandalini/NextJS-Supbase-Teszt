'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import EditableTable from '@/app/components/EditableTable';

export interface DefaultSyncLocationsTableProps {
    profileId?: string;
    readonly?: boolean;
}

export default function DefaultSyncLocationsTable({ profileId, readonly }: DefaultSyncLocationsTableProps) {
    const [defaults, setDefaults] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const isInline = !!profileId;

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch sync locations (active or all)
            const { data: locData } = await supabase.from('sync_locations').select('*').order('name');
            if (locData) setLocations(locData);

            // Fetch profiles if not inline
            if (!isInline) {
                const { data: profData } = await supabase.from('profiles').select('id, display_name').order('display_name');
                if (profData) setProfiles(profData);
            }

            // Fetch current defaults
            let query = supabase.from('profile_default_sync_locations').select('*').order('created_at', { ascending: false });
            if (isInline) {
                query = query.eq('profile_id', profileId);
            }

            const { data: defData, error } = await query;
                
            if (error) throw error;
            
            // Map the data to include a virtual 'id' for EditableTable
            // Need a unique ID for rows, combination of profile_id and sync_location_id
            if (defData) {
                const mappedData = defData.map(d => ({
                    ...d,
                    id: `${d.profile_id}_${d.sync_location_id}`, // Virtual unique ID for the table
                    original_sync_location_id: d.sync_location_id,
                    original_profile_id: d.profile_id
                }));
                setDefaults(mappedData);
            }
        } catch (error) {
            console.error('Error fetching default sync locations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (row: any) => {
        const { id, created_at, original_sync_location_id, original_profile_id, ...updateData } = row;
        
        const targetProfileId = isInline ? profileId : row.profile_id;

        if (!targetProfileId) {
            alert('Kérlek válassz egy szervezőt!');
            return;
        }

        if (!row.sync_location_id) {
            alert('Kérlek válassz egy szinkronizálási helyet!');
            return;
        }

        if (id && !id.startsWith('new-')) {
            // Update: In a composite key table, if they changed the location or profile, it's safer to delete old and insert new.
            if (original_sync_location_id !== row.sync_location_id || original_profile_id !== targetProfileId) {
                await supabase.from('profile_default_sync_locations')
                    .delete()
                    .eq('profile_id', original_profile_id)
                    .eq('sync_location_id', original_sync_location_id);
                    
                const { error } = await supabase.from('profile_default_sync_locations').insert([{
                    profile_id: targetProfileId,
                    sync_location_id: row.sync_location_id
                }]);
                
                if (error) {
                    console.error('Update (Insert) error:', error);
                    alert('Hiba történt a mentés során.');
                }
            }
        } else {
            // Insert
            const { error } = await supabase.from('profile_default_sync_locations').insert([{
                profile_id: targetProfileId,
                sync_location_id: row.sync_location_id
            }]);
            
            if (error) {
                console.error('Insert error:', error);
                if (error.code === '23505') {
                    alert('Ez a helyszín már hozzá van adva!');
                } else {
                    alert('Hiba történt a hozzáadás során. Ellenőrizd a konzolt további információért!');
                }
            }
        }
        await fetchData();
    };

    const handleDelete = async (id: string | number) => {
        if (typeof id === 'string' && id.startsWith('new-')) {
            setDefaults(defaults.filter(d => d.id !== id));
            return;
        }
        
        if (!confirm('Biztosan törölni szeretnéd ezt az alapértelmezett beállítást?')) return;
        
        // Recover original payload using the mapped 'id' field which combined profile_id_location_id
        const itemToDelete = defaults.find(d => d.id === id);

        if (!itemToDelete) return;

        const { error } = await supabase
            .from('profile_default_sync_locations')
            .delete()
            .eq('profile_id', itemToDelete.profile_id)
            .eq('sync_location_id', itemToDelete.sync_location_id);
            
        if (error) {
            console.error('Delete error:', error);
            alert('Hiba történt a törlés során.');
        } else {
            fetchData();
        }
    };

    const handleAddNew = () => {
        const newDefault = {
            id: `new-${Date.now()}`,
            profile_id: isInline ? profileId : '',
            sync_location_id: '',
        };
        setDefaults([newDefault, ...defaults]);
    };

    const getLocationName = (locId: string) => {
        return locations.find(l => l.id === locId)?.name || '-';
    };

    const getProfileName = (profId: string) => {
        return profiles.find(p => p.id === profId)?.display_name || 'Ismeretlen szervező';
    };

    const columns = useMemo(() => {
        const cols: any[] = [];

        if (!isInline) {
            cols.push({
                key: 'profile_id',
                label: 'Szervező neve',
                width: 250,
                editable: !readonly,
                render: (val: string) => getProfileName(val),
                customEditRender: (value: any, row: any, onChange: (val: any) => void) => {
                    return (
                        <select
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-gold text-xs"
                        >
                            <option value="">-- Válassz szervezőt --</option>
                            {profiles.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.display_name || 'Névtelen (' + opt.id + ')'}
                                </option>
                            ))}
                        </select>
                    );
                }
            });
        }

        cols.push({
            key: 'sync_location_id',
            label: 'Alapértelmezett Szinkronizálási Helyszín',
            width: 300,
            editable: !readonly,
            render: (val: string) => getLocationName(val),
            customEditRender: (value: any, row: any, onChange: (val: any) => void) => {
                // Only show locations that target 'all' or 'Esemény' because this is default for new events
                const filteredLocs = locations.filter(l => l.target_type === 'all' || l.target_type === 'Esemény' || l.target_type === 'Szervező');
                
                return (
                    <select
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-gold text-xs"
                    >
                        <option value="">-- Válassz helyszínt --</option>
                        {filteredLocs.map(opt => (
                            <option key={opt.id} value={opt.id}>
                                {opt.name}
                            </option>
                        ))}
                    </select>
                );
            }
        });

        cols.push({
            key: 'created_at',
            label: 'Hozzáadva',
            width: 200,
            editable: false,
            render: (val: string) => {
                if (!val) return '-';
                const date = new Date(val);
                return (
                    <div className="text-[10px] text-gray-400 font-mono">
                        {date.toLocaleDateString('hu-HU')} {date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                );
            }
        });

        return cols;
    }, [locations, profiles, readonly, isInline]);

    return (
        <div className="relative z-0">
            <EditableTable
                data={defaults}
                columns={columns}
                onSave={handleSave}
                onDelete={handleDelete}
                idField="id"
                storageKey={`profile_default_sync_locations_${isInline ? 'inline' : 'global'}`}
                canEdit={!readonly}
                canDelete={!readonly}
                loading={loading}
                actionsPosition="start"
                headerActions={!readonly ? (
                    <button
                        onClick={handleAddNew}
                        className="bg-gold/20 text-gold border border-gold/50 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest whitespace-nowrap hover:bg-gold/30 transition-all flex items-center gap-1.5 shadow-[0_0_10px_var(--color-gold)]/20"
                    >
                        <span>+</span> Új Alapértelmezés
                    </button>
                ) : null}
            />
        </div>
    );
}
