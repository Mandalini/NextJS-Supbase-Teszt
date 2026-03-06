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
    const [overriddenTheme, setOverriddenTheme] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTheme = urlParams.get('theme') as ThemeType;
        const validThemes = ['default', 'green', 'gong', 'rezgesekhaza', 'cyberpunk'];

        let initialTheme = 'default' as ThemeType;

        if (urlTheme && validThemes.includes(urlTheme)) {
            initialTheme = urlTheme;
            setOverriddenTheme(true);
        } else {
            const storedTheme = localStorage.getItem('app-theme') as ThemeType;
            if (storedTheme) {
                initialTheme = storedTheme;
            }
        }

        setThemeState(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme === 'default' ? '' : initialTheme);
        localStorage.setItem('app-theme', initialTheme);
    }, []);

    useEffect(() => {
        if (!isLoading && user && user.user_metadata?.theme) {
            const dbTheme = user.user_metadata.theme as ThemeType;

            // Ha NEM az URL-ből töltöttük be induláskor, alkalmazzuk a profil témát
            if (!overriddenTheme) {
                // Biztos, ami biztos, always set if user object is present
                setThemeState(dbTheme);
                localStorage.setItem('app-theme', dbTheme);
                document.documentElement.setAttribute('data-theme', dbTheme === 'default' ? '' : dbTheme);
            }
        }
    }, [user, isLoading, overriddenTheme]);

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
