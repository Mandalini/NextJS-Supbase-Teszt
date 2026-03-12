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
    type?: 'text' | 'boolean' | 'number' | 'date' | 'time' | 'select';
    options?: { value: any, label: string }[];
    render?: (value: any, row: any) => React.ReactNode;
    customEditRender?: (value: any, row: any, onChange: (val: any) => void) => React.ReactNode;
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
    customActions?: (row: any) => React.ReactNode;
    headerActions?: React.ReactNode;
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
    canDelete = true,
    customActions,
    headerActions
}: EditableTableProps) {
    const [tableColumns, setTableColumns] = useState<Column[]>(columns);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    
    const resizerRef = useRef<{ index: number; startWidth: number; startX: number } | null>(null);
    const columnsRef = useRef<Column[]>(tableColumns);

    // Sync ref with state for use in event listeners
    useEffect(() => {
        columnsRef.current = tableColumns;
    }, [tableColumns]);

    // Initialize columns from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`table_settings_${storageKey}`);
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.columns) {
                    const merged = settings.columns.map((savedCol: any) => {
                        const original = columns.find(c => c.key === savedCol.key);
                        // Csak akkor tartsuk meg a szélességet, ha az eredeti oszlop még létezik
                        return original ? { ...original, width: savedCol.width || original.width } : null;
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

    const resetSettings = () => {
        localStorage.removeItem(`table_settings_${storageKey}`);
        setTableColumns(columns);
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

    // Calculate total width for the table element
    const totalTableWidth = useMemo(() => {
        let w = tableColumns.reduce((acc, col) => acc + (col.width || 150), 0);
        if (canEdit || canDelete || !!customActions) w += 120; // Műveletek oszlop fix szélessége
        return w;
    }, [tableColumns, canEdit, canDelete, customActions]);

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
        const resizer = resizerRef.current;
        if (!resizer) return;
        
        const diff = e.pageX - resizer.startX;
        const newWidth = Math.max(50, resizer.startWidth + diff);
        const colIndex = resizer.index;
        
        setTableColumns((prev) => {
            const newCols = [...prev];
            if (newCols[colIndex]) {
                newCols[colIndex] = { ...newCols[colIndex], width: newWidth };
            }
            return newCols;
        });
    };

    const handleResizeEnd = () => {
        if (resizerRef.current) {
            saveSettings(columnsRef.current);
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
                        {customActions && customActions(row)}
                    </>
                )}
            </div>
        </td>
    );

    const renderActionsHeader = () => (
        <th className={`w-[120px] px-4 py-4 ${actionsPosition === 'start' ? 'text-left' : 'text-right'} font-bold text-brand-blue uppercase tracking-widest text-[10px]`}>Műveletek</th>
    );

    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-end items-center gap-4 mb-1">
                {headerActions}
                <button
                    onClick={resetSettings}
                    className="text-[9px] uppercase tracking-widest font-bold text-gray-500 hover:text-gold transition-colors flex items-center gap-1"
                    title="Táblázat elrendezésének alaphelyzetbe állítása"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Elrendezés alaphelyzetbe
                </button>
            </div>
                <div className="overflow-x-auto glass-panel rounded-xl glow-border">
            <table 
                className="divide-y divide-white/10 text-sm table-fixed" 
                style={{ width: `${totalTableWidth}px`, minWidth: '100%' }}
            >
                <thead className="bg-black/40">
                    <tr>
                        {(canEdit || canDelete || !!customActions) && actionsPosition === 'start' && renderActionsHeader()}
                        {tableColumns.map((col, idx) => (
                            <th
                                key={col.key}
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={() => handleDrop(idx)}
                                style={{ width: `${col.width || 150}px` }}
                                className={`relative px-4 py-4 text-left font-bold uppercase tracking-widest text-[10px] group cursor-move select-none transition-colors
                                    ${sortConfig.key === col.key ? 'text-gold' : 'text-brand-blue'}
                                    ${draggedIdx === idx ? 'opacity-30' : 'opacity-100'}
                                    hover:bg-white/5`}
                                onClick={() => handleSort(col.key)}
                            >
                                <div className="flex items-center gap-1 truncate pr-2">
                                    <span className="truncate">{col.label}</span>
                                    {sortConfig.key === col.key && (
                                        <span className="flex-shrink-0">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </div>
                                <div
                                    onMouseDown={(e) => handleResizeStart(e, idx)}
                                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-gold/50 transition-colors z-20 group-hover:bg-white/10"
                                />
                            </th>
                        ))}
                        {(canEdit || canDelete || !!customActions) && actionsPosition === 'end' && renderActionsHeader()}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {sortedData.map((row) => (
                        <tr key={row[idField]} className="hover:bg-white/5 transition-colors group">
                            {(canEdit || canDelete || !!customActions) && actionsPosition === 'start' && renderActions(row)}
                            {tableColumns.map((col) => {
                                const isEditing = editingId === row[idField];
                                const value = isEditing ? editData[col.key] : row[col.key];

                                return (
                                    <td key={col.key} className="px-4 py-3 truncate">
                                        <div className="truncate">
                                            {isEditing && col.editable ? (
                                                col.customEditRender ? (
                                                    col.customEditRender(value, editData, (newVal) => handleChange(col.key, newVal))
                                                ) : col.type === 'boolean' ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={!!value}
                                                        onChange={(e) => handleChange(col.key, e.target.checked)}
                                                        className="w-4 h-4 rounded border-white/20 bg-black/40"
                                                    />
                                                ) : col.type === 'select' ? (
                                                    <select
                                                        value={value ?? ''}
                                                        onChange={(e) => handleChange(col.key, e.target.value)}
                                                        className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-gold text-xs"
                                                    >
                                                        {col.options?.map(opt => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={col.type || 'text'}
                                                        value={value ?? ''}
                                                        onChange={(e) => handleChange(col.key, e.target.value)}
                                                        className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-gold text-xs"
                                                    />
                                                )
                                            ) : col.render ? (
                                                col.render(value, row)
                                            ) : (
                                                <span className={`${row.highlight ? "text-gold font-bold" : "text-gray-300"} truncate block`}>
                                                    {col.type === 'boolean' 
                                                        ? (value ? '✅' : '❌') 
                                                        : col.type === 'time' && typeof value === 'string'
                                                            ? value.substring(0, 5)
                                                            : (col.key === 'title' || col.key === 'event_url' || col.key === 'source_url')
                                                                ? (
                                                                    (col.key === 'title' ? (row.event_url || row.source_url) : value) ? (
                                                                        <a 
                                                                            href={col.key === 'title' ? (row.event_url || row.source_url) : value} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            className="text-brand-blue hover:text-gold hover:underline transition-colors flex items-center gap-1 group/link truncate inline-flex max-w-full"
                                                                        >
                                                                            <span className="truncate">{value?.toString() || '-'}</span>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                            </svg>
                                                                        </a>
                                                                    ) : (
                                                                        <span className="truncate">{value?.toString() || '-'}</span>
                                                                    )
                                                                )
                                                                : <span className="truncate">{value?.toString() || '-'}</span>}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                );
                            })}
                            {(canEdit || canDelete || !!customActions) && actionsPosition === 'end' && renderActions(row)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
    );
}
