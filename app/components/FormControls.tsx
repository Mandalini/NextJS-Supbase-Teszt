"use client";

import { useState, useRef, useEffect } from 'react';

export function CustomDateInput({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const [textValue, setTextValue] = useState(value ? value.replace(/-/g, '.') : '');
    const dateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (value) {
            setTextValue(value.replace(/-/g, '.'));
        }
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        setTextValue(val);
        // Basic validation: YYYY.MM.DD
        const regex = /^\d{4}\.\d{2}\.\d{2}$/;
        if (regex.test(val)) {
            const dateStr = val.replace(/\./g, '-');
            if (!isNaN(Date.parse(dateStr))) {
                onChange(dateStr);
            }
        }
    };

    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value; // YYYY-MM-DD
        if (val) {
            onChange(val);
            setTextValue(val.replace(/-/g, '.'));
        }
    };

    const handleOpenPicker = () => {
        try {
            if (dateInputRef.current && 'showPicker' in dateInputRef.current) {
                dateInputRef.current.showPicker();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="relative group">
            <input
                type="text"
                placeholder="ÉÉÉÉ.HH.NN"
                value={textValue}
                onChange={handleTextChange}
                className="w-full bg-black/40 border border-white/20 rounded-xl p-3 pr-10 pl-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors font-mono text-xs"
            />
            {/* Native date picker hidden but clickable via the calendar icon */}
            <div
                className="absolute top-0 right-0 bottom-0 w-10 flex items-center justify-center text-gray-400 group-hover:text-gold transition-colors overflow-hidden cursor-pointer"
                onClick={handleOpenPicker}
            >
                <input
                    ref={dateInputRef}
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    onChange={handleDateSelect}
                    value={value || ''}
                    style={{ WebkitAppearance: 'none' }}
                />
                <span className="pointer-events-none text-base relative z-0">📅</span>
            </div>

        </div>
    );
}

export function CustomCategorySelect({ value, onChange, categories }: { value: string, onChange: (val: string) => void, categories: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors cursor-pointer hover:border-brand-blue/50 flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? "text-white" : "text-gray-400 font-light"}>{value || 'Válassz kategóriát...'}</span>
                <span className={`text-brand-blue transition-transform duration-300 text-xs ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </div>
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {categories.map((cat) => (
                            <div
                                key={cat.id}
                                className={`p-3 cursor-pointer hover:bg-brand-blue/20 transition-colors ${value === cat.name ? 'bg-brand-blue/10 text-brand-blue font-bold border-l-2 border-brand-blue' : 'text-gray-300'}`}
                                onClick={() => {
                                    onChange(cat.name);
                                    setIsOpen(false);
                                }}
                            >
                                {cat.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
