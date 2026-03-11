/**
 * EditableTable.tsx
 * Célja: Egy univerzális, újrafelhasználható táblázat komponens, amely lehetővé teszi 
 * az adatbázis táblák (pl. scrape_sources, soundbath_events) kényelmes kezelését.
 * Főbb funkciók:
 * - Helyben történő (inline) szerkesztés, mentés és törlés.
 * - Oszlopok átméretezése (resizable) és sorrendjének változtatása (drag & drop).
 * - Beállítások (szélesség, sorrend) automatikus mentése a localStorage-ba.
 * - Rendezés az oszlopfejlécekre kattintva.
 * - Glassmorphism design a projekt stílusához igazodva.
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

interface Column {
    key: string;
    label: string;
    width?: number;
    editable?: boolean;
    type?: 'text' | 'boolean' | 'number' | 'date' | 'time';
}

interface EditableTableProps {
    data: any[];
    columns: Column[];
    onSave: (row: any) => Promise<void>;
    onDelete: (id: string | number) => Promise<void>;
    idField: string;
    storageKey: string;
    loading?: boolean;
    actionsPosition?: 'start' | 'end';
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function EditableTable({
    data,
    columns,
    onSave,
    onDelete,
    idField,
    storageKey,
    loading,
    actionsPosition = 'end',
    canEdit = true,
    canDelete = true
}: EditableTableProps) {
    const [tableColumns, setTableColumns] = useState<Column[]>(columns);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    
    const resizerRef = useRef<{ index: number; startWidth: number; startX: number } | null>(null);

    // Initialize columns from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`table_settings_${storageKey}`);
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.columns) {
                    const merged = settings.columns.map((savedCol: any) => {
                        const original = columns.find(c => c.key === savedCol.key);
                        return original ? { ...original, width: savedCol.width } : null;
                    }).filter(Boolean);
                    
                    const missing = columns.filter(c => !settings.columns.find((sc: any) => sc.key === c.key));
                    setTableColumns([...merged, ...missing]);
                }
            } catch (e) {
                console.error('Failed to load table settings', e);
            }
        } else {
            setTableColumns(columns);
        }
    }, [storageKey, columns]);

    const saveSettings = (cols: Column[]) => {
        const settings = {
            columns: cols.map(c => ({ key: c.key, width: c.width }))
        };
        localStorage.setItem(`table_settings_${storageKey}`, JSON.stringify(settings));
    };

    // Sorting Logic
    const sortedData = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return data;

        return [...data].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            const comparison = aVal < bVal ? -1 : 1;
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [data, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' | null = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
        
        setSortConfig({ key, direction });
    };

    // Column Reordering (Drag & Drop)
    const handleDragStart = (idx: number) => {
        setDraggedIdx(idx);
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
    };

    const handleDrop = (targetIdx: number) => {
        if (draggedIdx === null || draggedIdx === targetIdx) return;
        
        const newCols = [...tableColumns];
        const [movedCol] = newCols.splice(draggedIdx, 1);
        newCols.splice(targetIdx, 0, movedCol);
        
        setTableColumns(newCols);
        saveSettings(newCols);
        setDraggedIdx(null);
    };

    const handleResizeStart = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        e.preventDefault();
        resizerRef.current = {
            index,
            startWidth: tableColumns[index].width || 150,
            startX: e.pageX
        };
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!resizerRef.current) return;
        const diff = e.pageX - resizerRef.current.startX;
        const newWidth = Math.max(50, resizerRef.current.startWidth + diff);
        
        const newCols = [...tableColumns];
        newCols[resizerRef.current.index] = { ...newCols[resizerRef.current.index], width: newWidth };
        setTableColumns(newCols);
    };

    const handleResizeEnd = () => {
        if (resizerRef.current) {
            saveSettings(tableColumns);
        }
        resizerRef.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    };

    const startEdit = (row: any) => {
        setEditingId(row[idField]);
        setEditData({ ...row });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(editData);
            setEditingId(null);
            setEditData(null);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key: string, value: any) => {
        setEditData((prev: any) => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Adatok betöltése...</div>;
    }

    const renderActions = (row: any) => (
        <td className={`px-4 py-3 whitespace-nowrap ${actionsPosition === 'start' ? 'text-left' : 'text-right'}`}>
            <div className={`flex gap-2 ${actionsPosition === 'start' ? 'justify-start' : 'justify-end'}`}>
                {editingId === row[idField] ? (
                    <>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="p-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/40 transition-all text-[10px] uppercase font-bold"
                        >
                            Mentés
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="p-1.5 bg-white/10 text-gray-400 border border-white/10 rounded hover:bg-white/20 transition-all text-[10px] uppercase font-bold"
                        >
                            Mégse
                        </button>
                    </>
                ) : (
                    <>
                        {canEdit && (
                            <button
                                onClick={() => startEdit(row)}
                                className="p-1.5 bg-white/5 border border-white/10 rounded text-gold hover:bg-gold hover:text-black transition-all shadow-inner"
                                title="Szerkesztés"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={() => onDelete(row[idField])}
                                className="p-1.5 bg-white/5 border border-white/10 rounded text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-inner"
                                title="Törlés"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </>
                )}
            </div>
        </td>
    );

    const renderActionsHeader = () => (
        <th className={`w-[120px] px-4 py-4 ${actionsPosition === 'start' ? 'text-left' : 'text-right'} font-bold text-brand-blue uppercase tracking-widest text-[10px]`}>Műveletek</th>
    );

    return (
        <div className="overflow-x-auto glass-panel rounded-xl glow-border">
            <table className="min-w-full divide-y divide-white/10 text-sm table-fixed">
                <thead className="bg-black/40">
                    <tr>
                        {(canEdit || canDelete) && actionsPosition === 'start' && renderActionsHeader()}
                        {tableColumns.map((col, idx) => (
                            <th
                                key={col.key}
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={() => handleDrop(idx)}
                                style={{ width: col.width ? `${col.width}px` : 'auto' }}
                                className={`relative px-4 py-4 text-left font-bold uppercase tracking-widest text-[10px] group cursor-move select-none transition-colors
                                    ${sortConfig.key === col.key ? 'text-gold' : 'text-brand-blue'}
                                    ${draggedIdx === idx ? 'opacity-30' : 'opacity-100'}
                                    hover:bg-white/5`}
                                onClick={() => handleSort(col.key)}
                            >
                                <div className="flex items-center gap-1">
                                    {col.label}
                                    {sortConfig.key === col.key && (
                                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </div>
                                <div
                                    onMouseDown={(e) => handleResizeStart(e, idx)}
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-brand-blue/50 transition-colors z-10"
                                />
                            </th>
                        ))}
                        {actionsPosition === 'end' && renderActionsHeader()}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {sortedData.map((row) => (
                        <tr key={row[idField]} className="hover:bg-white/5 transition-colors group">
                            {actionsPosition === 'start' && renderActions(row)}
                            {tableColumns.map((col) => {
                                const isEditing = editingId === row[idField];
                                const value = isEditing ? editData[col.key] : row[col.key];

                                return (
                                    <td key={col.key} className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis">
                                        {isEditing && col.editable ? (
                                            col.type === 'boolean' ? (
                                                <input
                                                    type="checkbox"
                                                    checked={!!value}
                                                    onChange={(e) => handleChange(col.key, e.target.checked)}
                                                    className="w-4 h-4 rounded border-white/20 bg-black/40"
                                                />
                                            ) : (
                                                <input
                                                    type={col.type || 'text'}
                                                    value={value ?? ''}
                                                    onChange={(e) => handleChange(col.key, e.target.value)}
                                                    className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-gold text-xs"
                                                />
                                            )
                                        ) : (
                                            <span className={row.highlight ? "text-gold font-bold" : "text-gray-300"}>
                                                {col.type === 'boolean' 
                                                    ? (value ? '✅' : '❌') 
                                                    : col.type === 'time' && typeof value === 'string'
                                                        ? value.substring(0, 5)
                                                        : (value?.toString() || '-')}
                                            </span>
                                        )}
                                    </td>
                                );
                            })}
                            {(canEdit || canDelete) && actionsPosition === 'end' && renderActions(row)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
