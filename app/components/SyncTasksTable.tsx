'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import EditableTable from '@/app/components/EditableTable';

export interface SyncTasksTableProps {
    fixedTargetType?: 'Szervező' | 'Esemény';
    fixedTargetId?: string;
    readonly?: boolean;
    onDataChange?: () => void;
}

export default function SyncTasksTable({ fixedTargetType, fixedTargetId, onDataChange, readonly }: SyncTasksTableProps) {
    const [tasks, setTasks] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const isInline = !!fixedTargetType && !!fixedTargetId;

    useEffect(() => {
        fetchData();
    }, [fixedTargetType, fixedTargetId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Sync Locations (only active ones, or all if we're just reading)
            const { data: locData } = await supabase.from('sync_locations').select('*').order('name');
            if (locData) setLocations(locData);

            // 2. Fetch Profiles for 'Szervező'
            const { data: profData } = await supabase.from('profiles').select('id, display_name').order('display_name');
            if (profData) setProfiles(profData);

            // 3. Fetch Events for 'Esemény'
            const { data: evtData } = await supabase.from('events').select('id, title').order('title');
            if (evtData) setEvents(evtData);

            // 4. Fetch Sync Tasks
            let query = supabase.from('sync_tasks').select('*').order('created_at', { ascending: false });
            if (isInline) {
                query = query.eq('target_type', fixedTargetType).eq('target_id', fixedTargetId);
            }
            const { data: taskData, error } = await query;
            if (error) throw error;
            if (taskData) setTasks(taskData);
            
        } catch (error) {
            console.error('Error fetching sync tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTargetName = (type: string, id: string) => {
        if (type === 'Szervező') {
            return profiles.find(p => p.id === id)?.display_name || 'Ismeretlen szervező';
        } else if (type === 'Esemény') {
            return events.find(e => e.id === id)?.title || 'Ismeretlen esemény';
        }
        return '-';
    };

    const getLocationName = (id: string) => {
        return locations.find(l => l.id === id)?.name || 'Ismeretlen helyszín';
    };

    const handleSave = async (row: any) => {
        const { id, created_at, updated_at, mock_target_name, mock_location_name, ...updateData } = row;
        
        if (isInline) {
            updateData.target_type = fixedTargetType;
            updateData.target_id = fixedTargetId;
        }

        if (id && !id.startsWith('new-')) {
            // Update
            const { error } = await supabase.from('sync_tasks').update(updateData).eq('id', id);
            if (error) {
                console.error('Update error:', error);
                alert('Hiba történt a mentés során.');
            }
        } else {
            // Insert
            const { error } = await supabase.from('sync_tasks').insert([updateData]);
            if (error) {
                console.error('Insert error:', error);
                alert('Hiba történt a hozzáadás során.');
            }
        }
        await fetchData();
        if (onDataChange) onDataChange();
    };

    const handleDelete = async (id: string | number) => {
        if (typeof id === 'string' && id.startsWith('new-')) {
            setTasks(tasks.filter(t => t.id !== id));
            return;
        }
        if (!confirm('Biztosan törölni szeretnéd ezt a szinkronizálási feladatot?')) return;
        
        const { error } = await supabase.from('sync_tasks').delete().eq('id', id);
        if (error) {
            console.error('Delete error:', error);
            alert('Hiba történt a törlés során.');
        } else {
            fetchData();
            if (onDataChange) onDataChange();
        }
    };

    const handleAddNew = () => {
        const newTask = {
            id: `new-${Date.now()}`,
            target_type: fixedTargetType || 'Szervező',
            target_id: fixedTargetId || '',
            sync_location_id: '',
            status: 'új',
            description: '',
            external_id: ''
        };
        setTasks([newTask, ...tasks]);
    };

    const columns: any[] = useMemo(() => {
        const cols: any[] = [];
        
        cols.push({
            key: 'status',
            label: 'Állapot',
            width: 150,
            editable: !readonly,
            type: 'select',
            options: [
                { value: 'új', label: 'Új' },
                { value: 'módosítandó', label: 'Módosítandó' },
                { value: 'szinkronizált', label: 'Szinkronizált' },
                { value: 'szinkron hiba', label: 'Szinkron Hiba' },
                { value: 'törölt', label: 'Törölt' }
            ],
            render: (val: string) => {
                const colors: Record<string, string> = {
                    'új': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
                    'módosítandó': 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
                    'szinkronizált': 'bg-green-500/20 text-green-400 border-green-500/50',
                    'szinkron hiba': 'bg-red-500/20 text-red-400 border-red-500/50',
                    'törölt': 'bg-gray-800 text-gray-500 border-gray-600'
                };
                const colorClass = colors[val] || 'bg-gray-800 text-gray-300';
                return (
                    <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${colorClass}`}>
                        {val || '-'}
                    </span>
                );
            }
        });

        if (!isInline) {
            cols.push({
                key: 'target_type',
                label: 'Típus',
                width: 120,
                editable: !readonly,
                type: 'select',
                options: [
                    { value: 'Szervező', label: 'Szervező' },
                    { value: 'Esemény', label: 'Esemény' }
                ]
            });

            cols.push({
                key: 'target_id',
                label: 'Szinkronizálandó neve',
                width: 250,
                editable: !readonly,
                render: (val: string, row: any) => getTargetName(row.target_type, val),
                customEditRender: (value: any, row: any, onChange: (val: any) => void) => {
                    const options = row.target_type === 'Szervező' 
                        ? profiles.map(p => ({ value: p.id, label: p.display_name }))
                        : events.map(e => ({ value: e.id, label: e.title }));
                        
                    return (
                        <select
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-gold text-xs"
                        >
                            <option value="">-- Válassz --</option>
                            {options.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    );
                }
            });

            cols.push({
                key: 'mock_target_id_display',
                label: 'Szinkronizálandó ID',
                width: 150,
                editable: false,
                render: (_: any, row: any) => <span className="text-[10px] text-gray-500 font-mono">{row.target_id || '-'}</span>
            });
        }

        cols.push({
            key: 'sync_location_id',
            label: 'Szinkronizálási hely',
            width: 200,
            editable: !readonly,
            render: (val: string) => getLocationName(val),
            customEditRender: (value: any, row: any, onChange: (val: any) => void) => {
                const targetType = isInline ? fixedTargetType : row.target_type;
                const filteredLocs = locations.filter(l => l.target_type === 'all' || l.target_type === targetType);
                
                return (
                    <select
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-gold text-xs"
                    >
                        <option value="">-- Válassz --</option>
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
            key: 'external_id',
            label: 'Külső Rendszer ID',
            width: 150,
            editable: !readonly,
        });

        cols.push({
            key: 'description',
            label: 'Leírás',
            width: 250,
            editable: !readonly,
        });

        cols.push({
            key: 'updated_at',
            label: 'Módosítás dátuma',
            width: 180,
            editable: false,
            render: (val: string) => {
                if (!val) return '-';
                const date = new Date(val);
                return (
                    <div className="text-[10px] text-gray-400 font-mono flex flex-col">
                        <span className="text-white font-bold">{date.toLocaleDateString('hu-HU')}</span>
                        <span>{date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                );
            }
        });

        return cols;
    }, [isInline, fixedTargetType, locations, profiles, events, readonly]);

    return (
        <div className="relative z-0">
            <EditableTable
                data={tasks}
                columns={columns}
                onSave={handleSave}
                onDelete={handleDelete}
                idField="id"
                storageKey={`sync_tasks_${fixedTargetType || 'all'}`}
                canEdit={!readonly}
                canDelete={!readonly}
                loading={loading}
                actionsPosition="start"
                headerActions={!readonly ? (
                    <button
                        onClick={handleAddNew}
                        className="bg-brand-blue/20 text-brand-blue border border-brand-blue/50 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest whitespace-nowrap hover:bg-brand-blue/30 transition-all flex items-center gap-1.5 shadow-[0_0_10px_var(--color-brand-blue)]/20"
                    >
                        <span>+</span> Új szinkron feladat
                    </button>
                ) : null}
            />
        </div>
    );
}
