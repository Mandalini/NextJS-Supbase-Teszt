// lib/contexts/ThemeContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabase';

export type ThemeType = 'default' | 'green' | 'gong' | 'rezgesekhaza' | 'cyberpunk';

interface ThemeContextType {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    saveThemeToProfile: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { user, isLoading } = useAuth();
    const [theme, setThemeState] = useState<ThemeType>('default');

    useEffect(() => {
        const storedTheme = localStorage.getItem('app-theme') as ThemeType;
        if (storedTheme) {
            setThemeState(storedTheme);
            document.documentElement.setAttribute('data-theme', storedTheme === 'default' ? '' : storedTheme);
        }
    }, []);

    useEffect(() => {
        if (!isLoading && user && user.user_metadata?.theme) {
            const dbTheme = user.user_metadata.theme as ThemeType;
            if (dbTheme !== theme) {
                setThemeState(dbTheme);
                localStorage.setItem('app-theme', dbTheme);
                document.documentElement.setAttribute('data-theme', dbTheme === 'default' ? '' : dbTheme);
            }
        }
    }, [user, isLoading]);

    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
        localStorage.setItem('app-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme === 'default' ? '' : newTheme);
    };

    const saveThemeToProfile = async () => {
        if (user) {
            await supabase.auth.updateUser({
                data: { theme: theme }
            });
            alert('A téma sikeresen elmentve a profilodhoz!');
        } else {
            alert('Jelentkezz be a téma elmentéséhez!');
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, saveThemeToProfile }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
