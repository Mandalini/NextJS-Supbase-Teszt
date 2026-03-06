'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomDateInput } from './FormControls';

export default function HomeEventList({ initialEvents, categories }: { initialEvents: any[], categories: any[] }) {
    const [selectedCategory, setSelectedCategory] = useState<string>('Összes');

    // Szűrési állapotok
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Nézet állapota ('grid' vagy 'table')
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Inicializáljuk a nézetet a localStorage-ból, ha van
    useEffect(() => {
        const savedView = localStorage.getItem('homeEventViewMode');
        if (savedView === 'grid' || savedView === 'table') {
            setViewMode(savedView);
        }
    }, []);

    const changeViewMode = (mode: 'grid' | 'table') => {
        setViewMode(mode);
        localStorage.setItem('homeEventViewMode', mode);
    };

    // Elérhető kategóriák kigyűjtése dinamikusan, plusz az "Összes" opció
    const categoryNames = ['Összes', ...categories.map(c => c.name)];

    // Szűrési logika
    const filteredEvents = initialEvents.filter(event => {
        const matchesCategory = selectedCategory === 'Összes' || event.category === selectedCategory;
        const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const eventDate = new Date(event.date).getTime();
        const matchesStartDate = startDate ? eventDate >= new Date(startDate).getTime() : true;
        const matchesEndDate = endDate ? eventDate <= new Date(endDate).getTime() + 86400000 : true;

        return matchesCategory && matchesSearch && matchesStartDate && matchesEndDate;
    });

    return (
        <div className="w-full relative z-10 text-white">
            {/* Kategóriák sáv */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
                {categoryNames.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${selectedCategory === cat
                            ? 'bg-brand-blue text-white shadow-[0_0_15px_var(--color-brand-blue)] border border-brand-blue'
                            : 'bg-black/40 text-gray-400 border border-white/10 hover:border-brand-blue/50 hover:text-white'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Kereső és Dátum Szűrők + Nézet váltó */}
            <div className="mb-12 glass-panel p-6 rounded-2xl glow-border flex flex-col xl:flex-row justify-between items-end gap-6 border border-white/10">
                <div className="flex flex-col w-full xl:w-auto">
                    <div className="flex flex-wrap gap-4 items-center w-full">
                        <div className="flex-grow sm:flex-grow-0">
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Keresés</label>
                            <input
                                type="text"
                                placeholder="Esemény címe..."
                                className="bg-black/40 border border-white/20 rounded-xl px-3 py-3 w-full sm:w-64 text-white placeholder-gray-500 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm transition-colors font-mono"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex-grow sm:flex-grow-0 sm:w-48">
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Ettől</label>
                            <CustomDateInput
                                value={startDate}
                                onChange={(val) => setStartDate(val)}
                            />
                        </div>
                        <div className="flex-grow sm:flex-grow-0 sm:w-48">
                            <label className="block text-[10px] uppercase tracking-widest text-brand-blue mb-1 font-bold">Eddig</label>
                            <CustomDateInput
                                value={endDate}
                                onChange={(val) => setEndDate(val)}
                            />
                        </div>
                        <div className="pt-5 w-full sm:w-auto text-right sm:text-left">
                            {(searchQuery || startDate || endDate || selectedCategory !== 'Összes') && (
                                <button
                                    onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setSelectedCategory('Összes'); }}
                                    className="text-xs text-gold hover:text-white tracking-widest uppercase transition-colors"
                                >
                                    Törlés
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 mt-4 xl:mt-0 w-full xl:w-auto justify-end">
                    <div className="flex bg-black/40 border border-white/10 rounded-xl p-1">
                        <button
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-blue text-white shadow-[0_0_10px_var(--color-brand-blue)]' : 'text-gray-500 hover:text-white'}`}
                            onClick={() => changeViewMode('grid')}
                        >
                            Kártyák
                        </button>
                        <button
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewMode === 'table' ? 'bg-brand-blue text-white shadow-[0_0_10px_var(--color-brand-blue)]' : 'text-gray-500 hover:text-white'}`}
                            onClick={() => changeViewMode('table')}
                        >
                            Táblázat
                        </button>
                    </div>
                </div>
            </div>

            {filteredEvents.length > 0 ? (
                <>
                    {/* KÁRTYÁS NÉZET */}
                    {viewMode === 'grid' && (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {filteredEvents.map((event) => (
                                <Link
                                    href={`/event/${event.id}`}
                                    key={event.id}
                                    className="glass-panel rounded-xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 glow-border group flex flex-col cursor-pointer relative border border-white/10 hover:border-brand-blue/50"
                                >
                                    {event.category && (
                                        <div className="absolute top-4 right-4 z-20 bg-brand-blue/90 backdrop-blur text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full shadow-[0_0_10px_var(--color-brand-blue)]">
                                            {event.category}
                                        </div>
                                    )}

                                    {event.image_url && (
                                        <div className="w-full h-48 overflow-hidden relative border-b border-white/10 shrink-0">
                                            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        </div>
                                    )}
                                    <div className="p-8 flex-grow flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center shadow-[0_0_15px_var(--color-brand-blue)] shrink-0">
                                                    <span className="text-white text-xs font-bold">
                                                        {new Date(event.date).getDate()}
                                                    </span>
                                                </div>
                                                <div className="uppercase tracking-widest text-[10px] text-gray-400 font-semibold">
                                                    {new Date(event.date).toLocaleDateString('hu-HU', {
                                                        year: 'numeric', month: 'long'
                                                    })}
                                                </div>
                                            </div>

                                            <h3 className="block mt-1 text-2xl font-bold text-white mb-3 group-hover:text-gold transition-colors">
                                                {event.title}
                                            </h3>

                                            {event.location && (
                                                <p className="text-gray-400 text-sm mb-4 flex items-center gap-2 font-mono">
                                                    <span className="text-gold">📍</span> {event.location}
                                                </p>
                                            )}

                                            {event.description && (
                                                <p className="mt-4 text-gray-300 line-clamp-3 leading-relaxed font-light mb-6">
                                                    {event.description}
                                                </p>
                                            )}

                                            <div className="mt-auto flex justify-end">
                                                <span className="text-gold text-[10px] uppercase tracking-widest font-bold group-hover:translate-x-2 transition-transform duration-300 flex items-center gap-2">
                                                    Részletek <span>&rarr;</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* TÁBLÁZATOS NÉZET */}
                    {viewMode === 'table' && (
                        <div className="overflow-x-auto glass-panel rounded-xl glow-border border border-white/10">
                            <table className="min-w-full divide-y divide-white/10 text-sm">
                                <thead className="bg-black/40">
                                    <tr>
                                        <th className="px-6 py-5 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px]">Cím</th>
                                        <th className="px-6 py-5 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px]">Dátum</th>
                                        <th className="px-6 py-5 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px]">Kategória</th>
                                        <th className="px-6 py-5 text-left font-bold text-brand-blue uppercase tracking-widest text-[10px]">Helyszín</th>
                                        <th className="px-6 py-5 text-right font-bold text-brand-blue uppercase tracking-widest text-[10px]">Műveletek</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredEvents.map((event) => (
                                        <tr key={event.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => window.location.href = `/event/${event.id}`}>
                                            <td className="px-6 py-5 font-bold text-white text-base">{event.title}</td>
                                            <td className="px-6 py-5 text-gray-400 whitespace-nowrap font-mono text-xs">{new Date(event.date).toLocaleDateString('hu-HU')}</td>
                                            <td className="px-6 py-5">
                                                <span className="bg-brand-blue/20 border border-brand-blue/50 text-brand-blue text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-bold whitespace-nowrap">
                                                    {event.category || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-gray-400 font-mono text-xs">{event.location || '-'}</td>
                                            <td className="px-6 py-5 text-right whitespace-nowrap">
                                                <Link
                                                    href={`/event/${event.id}`}
                                                    className="text-gold hover:text-white font-bold uppercase tracking-widest text-[10px] transition-colors bg-gold/10 px-4 py-2 rounded-full border border-gold/30 hover:bg-gold/30"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Részletek &rarr;
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-24 glass-panel rounded-2xl glow-border">
                    <span className="text-6xl mb-6 block text-white opacity-20">(( • ))</span>
                    <h3 className="text-2xl font-light text-white mb-2">Nincs a szűrésnek megfelelő esemény a naptárban.</h3>
                    <p className="mt-2 text-gray-400 font-mono text-sm">Válassz más feltételeket vagy töröld a szűrőket.</p>
                </div>
            )}
        </div>
    );
}
