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
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="w-full max-w-md">
                <h1 className="text-4xl font-bold mb-8 text-center">Bejelentkezés</h1>
                <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
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
            </div>
        </main>
    )
}