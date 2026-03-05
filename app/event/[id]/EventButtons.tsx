'use client';

import { useState } from 'react';

export default function EventButtons() {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mt-16 pt-10 border-t border-white/10 flex flex-col sm:flex-row gap-4 items-center justify-center">
            {/* Részt veszek (Későbbi fejlesztés, most egy fiktív vizuális effekt) */}
            <button
                className="bg-gradient-to-r from-[#5b42ff] to-[#9d4edd] text-white font-extrabold px-10 py-4 rounded-xl shadow-[0_0_20px_rgba(91,66,255,0.4)] hover:shadow-[0_0_30px_rgba(91,66,255,0.6)] hover:-translate-y-1 transition-all duration-300 uppercase tracking-widest text-sm w-full sm:w-auto relative overflow-hidden group"
                onClick={() => alert("Résztvétel rögzítése hamarosan!")}
            >
                <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                Részt Veszek (Hamarosan)
            </button>

            {/* Link másolása gomb */}
            <button
                onClick={handleCopy}
                className={`bg-transparent border ${copied ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-white/20 text-white hover:bg-white/10'} px-10 py-4 rounded-xl transition-all uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-3 w-full sm:w-auto`}
            >
                <span>{copied ? '✅' : '🔗'}</span> {copied ? 'Másolva!' : 'Link másolása'}
            </button>
        </div>
    );
}
