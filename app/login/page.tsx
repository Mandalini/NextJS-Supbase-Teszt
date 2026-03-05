// app/login/page.tsx
'use client';

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthPage() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        // Figyeli a session változásait
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                if (session) {
                    router.push('/dashboard');
                }
            }
        );

        // Első betöltéskor lekérjük a jelenlegi sessiont
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                // ITT VOLT A MÁSIK '/', EZT IS ÁTÍRTUK:
                router.push('/dashboard');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [router]);

    if (session) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-24">
                <h1 className="text-2xl">Már be vagy jelentkezve. Átirányítás...</h1>
            </div>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black relative">
            {/* Dekorációs elemek háttérben */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#5b42ff] rounded-full mix-blend-screen filter blur-[150px] opacity-20 pointer-events-none"></div>
            <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-[#ffc107] rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>

            <div className="w-full max-w-md glass-panel p-10 rounded-2xl glow-border relative z-10 shadow-2xl">

                <div className="text-center mb-10">
                    <h1 className="text-3xl font-light tracking-[0.2em] text-white">
                        REZGÉS<span className="text-gold font-bold glow-text">KAPU</span>
                    </h1>
                    <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest">Digitális Partneri Platform</p>
                </div>
                <Auth
                    supabaseClient={supabase}
                    appearance={{
                        theme: ThemeSupa,
                        variables: {
                            default: {
                                colors: {
                                    brand: '#ffc107',
                                    brandAccent: '#e0a800',
                                    brandButtonText: 'black',
                                    defaultButtonBackground: 'rgba(30, 41, 59, 0.4)',
                                    defaultButtonBackgroundHover: 'rgba(91, 66, 255, 0.4)',
                                    defaultButtonBorder: 'rgba(255,255,255,0.1)',
                                    defaultButtonText: 'white',
                                    dividerBackground: 'rgba(255,255,255,0.1)',
                                    inputBackground: 'rgba(0,0,0,0.4)',
                                    inputBorder: 'rgba(255,255,255,0.2)',
                                    inputBorderHover: '#ffc107',
                                    inputBorderFocus: '#ffc107',
                                    inputText: 'white',
                                    inputPlaceholder: 'rgba(255,255,255,0.4)',
                                    messageText: '#ffc107',
                                    messageTextDanger: '#ff4d4f',
                                    anchorTextColor: '#5b42ff',
                                    anchorTextHoverColor: '#9d4edd',
                                },
                                space: {
                                    buttonPadding: '14px 16px',
                                    inputPadding: '14px 16px',
                                },
                                radii: {
                                    borderRadiusButton: '0.75rem',
                                    buttonBorderRadius: '0.75rem',
                                    inputBorderRadius: '0.75rem',
                                },
                                fonts: {
                                    bodyFontFamily: `'Inter', Arial, sans-serif`,
                                    buttonFontFamily: `'Inter', Arial, sans-serif`,
                                    inputFontFamily: `'Inter', Arial, sans-serif`,
                                    labelFontFamily: `'Inter', Arial, sans-serif`,
                                },
                            }
                        },
                        style: {
                            button: { fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '12px', border: 'none', transition: 'all 0.3s' },
                            input: { letterSpacing: '1px' },
                            label: { color: '#9ca3af', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' },
                            anchor: { fontWeight: 'bold' }
                        }
                    }}
                    providers={['google']}
                    // A REDIRECT-ET IS A DASHBOARDRA IRÁNYÍTJUK:
                    redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`}
                    localization={{
                        variables: {
                            sign_in: {
                                email_label: 'Email cím',
                                password_label: 'Jelszó',
                                email_input_placeholder: 'Az email címed',
                                password_input_placeholder: 'A jelszavad',
                                button_label: 'Bejelentkezés',
                                // JAVÍTVA social_auth_text -> social_provider_text
                                social_provider_text: 'Bejelentkezés ezzel:',
                                link_text: 'Már van fiókod? Jelentkezz be.',
                            },
                            sign_up: {
                                email_label: 'Email cím',
                                password_label: 'Jelszó',
                                email_input_placeholder: 'Az email címed',
                                password_input_placeholder: 'A jelszavad',
                                button_label: 'Regisztráció',
                                // JAVÍTVA social_auth_text -> social_provider_text
                                social_provider_text: 'Regisztráció ezzel:',
                                link_text: 'Még nincs fiókod? Regisztrálj.',
                            },
                            forgotten_password: {
                                email_label: 'Email cím',
                                password_label: 'Jelszó',
                                email_input_placeholder: 'Az email címed',
                                button_label: 'Jelszó visszaállítása',
                                link_text: 'Elfelejtetted a jelszavad?',
                            },
                            magic_link: {
                                email_input_placeholder: 'Az email címed',
                                button_label: 'Magic link küldése',
                                link_text: 'Magic link küldése',
                            },
                            update_password: {
                                password_label: 'Új jelszó',
                                password_input_placeholder: 'Az új jelszavad',
                                button_label: 'Jelszó frissítése',
                            }
                        },
                    }}
                />
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-400 hover:text-white text-xs uppercase tracking-widest transition-colors"
                    >
                        &larr; Vissza a kezdőlapra
                    </button>
                </div>
            </div>
        </main>
    )
}