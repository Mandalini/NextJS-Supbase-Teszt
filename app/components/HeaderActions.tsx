'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import ThemeSwitcher from './ThemeSwitcher';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function HeaderActions() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    if (isLoading) {
        return <div className="h-10 w-24 animate-pulse bg-white/5 rounded-full"></div>;
    }

    return (
        <div className="flex items-center gap-3">
            {user ? (
                <>
                    <Link href="/dashboard" className="hidden sm:inline-flex bg-brand-blue text-white px-5 py-2 rounded-full hover:bg-brand-purple transition-all duration-300 uppercase tracking-widest text-xs font-semibold shadow-[0_0_15px_var(--color-brand-blue)]">
                        Vezérlőpult
                    </Link>
                    <Link href="/profile" className="inline-flex items-center gap-2 hover:text-white transition-colors cursor-pointer group text-sm text-gray-400 border-l border-white/10 pl-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center text-white font-bold group-hover:shadow-[0_0_15px_var(--color-brand-blue)] transition-all overflow-hidden border border-brand-purple/50">
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Profil" className="w-full h-full object-cover" />
                            ) : (
                                user?.user_metadata?.display_name ? user.user_metadata.display_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()
                            )}
                        </div>
                        <span className="hidden lg:inline-block font-bold truncate max-w-[120px]">{user?.user_metadata?.display_name || user?.email?.split('@')[0]}</span>
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="text-red-400 hover:text-white transition-colors p-2 rounded-full hover:bg-red-500/80 bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-500/20"
                        title="Kijelentkezés"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                    <div className="ml-1 border-l border-white/10 pl-3">
                        <ThemeSwitcher />
                    </div>
                </>
            ) : (
                <>
                    <Link
                        href="/login"
                        className="bg-brand-blue text-white px-6 py-2 rounded-full hover:bg-brand-purple transition-all duration-300 uppercase tracking-widest text-xs font-semibold shadow-[0_0_15px_var(--color-brand-blue)]"
                    >
                        Bejelentkezés
                    </Link>
                    <div className="ml-2">
                        <ThemeSwitcher />
                    </div>
                </>
            )}
        </div>
    );
}
