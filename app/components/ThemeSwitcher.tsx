'use client';

import { useState } from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function ThemeSwitcher({ showName = false }: { showName?: boolean }) {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const themes = [
        { id: 'default', name: 'Alapértelmezett' },
        { id: 'green', name: 'Sötétzöld' },
        { id: 'gong', name: 'Gong Akadémia' },
        { id: 'rezgesekhaza', name: 'Rezgések Háza' },
        { id: 'cyberpunk', name: 'Modern Cyberpunk' },
    ];

    const currentThemeName = themes.find(t => t.id === theme)?.name || 'Alapértelmezett';

    return (
        <div className="relative inline-block text-left z-50">
            <div>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-blue bg-black/40 border border-brand-blue/30 rounded-lg hover:bg-brand-blue/10 transition-colors shadow-[0_0_10px_var(--color-brand-blue)]/20"
                >
                    TÉMA {showName && <span className="text-gray-400 capitalize font-normal ml-1">- {currentThemeName}</span>}
                    <svg className="w-4 h-4 ml-1 -mr-1 text-brand-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <>
                    {/* Hátteret blokkoló overlay kattintás kívülre észleléséhez */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-2xl glass-panel border border-brand-blue/30 z-50 overflow-hidden backdrop-blur-xl">
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setTheme(t.id as any);
                                        setIsOpen(false);
                                    }}
                                    className={`block w-full text-left px-4 py-3 text-xs uppercase tracking-widest font-bold transition-colors ${theme === t.id
                                        ? 'bg-brand-blue/20 text-brand-blue border-l-4 border-brand-blue'
                                        : 'text-gray-300 hover:bg-white/10 hover:text-white border-l-4 border-transparent'
                                        }`}
                                    role="menuitem"
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
