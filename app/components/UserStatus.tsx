// app/components/UserStatus.tsx
'use client';

import { useAuth } from '../../lib/contexts/AuthContext'; // Ellenőrizd az útvonalat!
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // <--- EZT NE FELEJTSD EL

export default function UserStatus() {
    const { user, isLoading, signOut } = useAuth();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="fixed left-0 top-0 flex w-full justify-end border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                <p className="mr-4">Loading user...</p>
            </div>
        );
    }

    return (
        <div className="fixed left-0 top-0 flex w-full justify-end border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
            {user ? (
                <>
                    <p className="mr-4">Hello, {user.email}!</p>
                    {/* Dashboard link hozzáadása */}
                    <Link href="/dashboard">
                        <span className="mr-4 text-blue-500 hover:underline cursor-pointer">Dashboard</span>
                    </Link>
                    <button
                        onClick={signOut}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-4 rounded"
                    >
                        Kijelentkezés
                    </button>
                </>
            ) : (
                <>
                    <p className="mr-4">You are not logged in.</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded"
                    >
                        Bejelentkezés
                    </button>
                </>
            )}
        </div>
    );
}