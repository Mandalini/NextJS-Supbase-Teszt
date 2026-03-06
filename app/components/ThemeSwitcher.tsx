'use client';

import { useTheme } from '@/lib/contexts/ThemeContext';

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();

    const themes = [
        { id: 'default', name: 'Alapértelmezett (Rezgéskapu)' },
        { id: 'green', name: 'Sötétzöld (Neon Emerald)' },
        { id: 'gong', name: 'Gong Akadémia' },
        { id: 'rezgesekhaza', name: 'Rezgések Háza' },
        { id: 'cyberpunk', name: 'Modern Cyberpunk' },
    ];

    return (
        <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-4 z-50 py-4 px-6 glass-panel rounded-full mx-auto max-w-fit mt-8 shadow-2xl">
            <span className="text-gray-300 text-xs font-bold uppercase tracking-widest mr-2">Téma választás:</span>
            {themes.map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={`px-4 py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all duration-300 ${theme === t.id
                            ? 'bg-brand-blue text-white shadow-[0_0_15px_var(--color-brand-blue)]'
                            : 'bg-black/30 text-gray-400 hover:text-white hover:bg-black/50 border border-white/10'
                        }`}
                >
                    {t.name}
                </button>
            ))}
        </div>
    );
}
