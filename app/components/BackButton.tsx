'use client';

import { useRouter } from 'next/navigation';

export default function BackButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            className="glass-panel px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold text-white hover:bg-white/10 transition-all flex items-center gap-2 border border-white/5 cursor-pointer"
        >
            <span>&larr;</span> Vissza
        </button>
    );
}
