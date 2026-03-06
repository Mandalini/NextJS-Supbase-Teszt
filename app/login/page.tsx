// app/login/page.tsx
'use client';

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function AuthForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [session, setSession] = useState<any>(null);

    const redirectPath = searchParams.get('redirect');
    const actionParam = searchParams.get('action');

    const getFinalRedirectPath = () => {
        if (redirectPath && actionParam) {
            return `${redirectPath}?action=${actionParam}`;
        } else if (redirectPath) {
            return redirectPath;
        }
        return '/';
    };

    useEffect(() => {
        // Figyeli a session változásait
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                if (session) {
                    router.push(getFinalRedirectPath());
                }
            }
        );

        // Első betöltéskor lekérjük a jelenlegi sessiont
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                router.push(getFinalRedirectPath());
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [router]);

    if (session) {
        return null;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black relative">
            {/* Dekorációs elemek háttérben */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue rounded-full mix-blend-screen filter blur-[150px] opacity-20 pointer-events-none"></div>
            <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gold rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>

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
                                    brand: 'var(--color-gold)',
                                    brandAccent: '#e0a800',
                                    brandButtonText: 'black',
                                    defaultButtonBackground: 'rgba(30, 41, 59, 0.4)',
                                    defaultButtonBackgroundHover: 'var(--color-brand-blue)',
                                    defaultButtonBorder: 'rgba(255,255,255,0.1)',
                                    defaultButtonText: 'white',
                                    dividerBackground: 'rgba(255,255,255,0.1)',
                                    inputBackground: 'rgba(0,0,0,0.4)',
                                    inputBorder: 'rgba(255,255,255,0.2)',
                                    inputBorderHover: 'var(--color-gold)',
                                    inputBorderFocus: 'var(--color-gold)',
                                    inputText: 'white',
                                    inputPlaceholder: 'rgba(255,255,255,0.4)',
                                    messageText: 'var(--color-gold)',
                                    messageTextDanger: '#ff4d4f',
                                    anchorTextColor: 'var(--color-brand-blue)',
                                    anchorTextHoverColor: 'var(--color-brand-purple)',
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
                    // A REDIRECT-ET IS A KEZDŐLAPRA IRÁNYÍTJUK:
                    redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/`}
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

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white glow-text">Betöltés...</div>}>
            <AuthForm />
        </Suspense>
    );
}