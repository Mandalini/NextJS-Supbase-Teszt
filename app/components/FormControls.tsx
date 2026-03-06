"use client";

import { useState, useRef, useEffect } from 'react';

export function CustomDateInput({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const [textValue, setTextValue] = useState(value ? value.replace(/-/g, '.') : '');

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

    return (
        <div className="relative group">
            <input
                type="text"
                placeholder="ÉÉÉÉ.HH.NN"
                value={textValue}
                onChange={handleTextChange}
                className="w-full bg-black/40 border border-white/20 rounded-xl p-3 pl-12 text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors font-mono"
            />
            {/* Native date picker hidden but clickable via the calendar icon */}
            <div className="absolute top-0 left-0 bottom-0 w-12 flex items-center justify-center text-gray-400 group-hover:text-gold transition-colors overflow-hidden">
                <input
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    onChange={handleDateSelect}
                    value={value || ''}
                />
                <span className="pointer-events-none text-xl relative z-0">📅</span>
            </div>

            <div className="absolute -top-6 right-0 text-[10px] text-gray-500 uppercase">
                Vagy gépeld be: ÉÉÉÉ.HH.NN
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
