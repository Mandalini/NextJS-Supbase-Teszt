'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import SyncTasksTable from '@/app/components/SyncTasksTable';
import { usePermissions } from '@/app/hooks/usePermissions';

export default function SyncTasksPage() {
    const { hasPermission, loading } = usePermissions();
    const router = useRouter();

    const canView = hasPermission('view_sync_rules');
    const canManage = hasPermission('manage_sync_rules');

    useEffect(() => {
        if (!loading && !canView && !canManage) {
            router.push('/dashboard');
        }
    }, [loading, canView, canManage, router]);

    if (loading) return <div className="p-8 text-center text-gray-500">Betöltés...</div>;
    if (!canView && !canManage) return null;

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen text-white relative z-0">
            <div className="flex flex-col mb-10 gap-4">
                <Link href="/dashboard" className="self-start px-5 py-2.5 glass-panel text-white hover:bg-white/10 rounded-xl transition-all glow-border text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 mb-4">
                    <span>&larr;</span> Vissza a Vezérlőpultra
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extralight tracking-wider">SZINKRONIZÁLÁS <span className="text-gold font-bold glow-text">VEZÉRLŐ</span></h1>
                        <p className="text-gray-400 text-sm font-light mt-2">
                            A szervezők és események szinkronizálásának kezelése a külső rendszerek felé.
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="relative z-0">
                <SyncTasksTable readonly={!canManage} />
            </div>
        </div>
    );
}
