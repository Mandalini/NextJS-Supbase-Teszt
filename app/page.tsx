// app/page.tsx
import { supabase } from '../lib/supabase';
import UserStatus from './components/UserStatus'; // Importáljuk a UserStatus komponenst

type TestItem = {
    id: number;
    name: string;
    created_at: string;
};

export default async function Home() {
    // Ezt a lekérdezést itt hagyhatjuk, mert ez szerver oldalon fut le
    const { data, error } = await supabase
        .from('test_items')
        .select('*');

    if (error) {
        console.error('Error fetching data:', error);
        return (
            <main className="flex min-h-screen flex-col items-center justify-between p-24">
                <h1 className="text-4xl font-bold">Error loading data!</h1>
                <p className="text-red-500">{error.message}</p>
            </main>
        );
    }

    const items: TestItem[] = data || [];

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
                <UserStatus /> {/* Itt használjuk a kliens oldali komponenst */}
            </div>

            <h1 className="text-4xl font-bold mb-8">Items from Supabase</h1>
            {/* Ide tesszük a verziószámot! */}
            <p className="text-blue-500 font-bold mb-8">Verzió: 1.0.1 (CI/CD Vercel teszt)</p>

            {items.length === 0 ? (
                <p>No items found.</p>
            ) : (
                <ul className="list-disc list-inside text-lg">
                    {items.map((item) => (
                        <li key={item.id}>
                            ID: {item.id}, Name: {item.name}, Created At: {new Date(item.created_at).toLocaleString()}
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-12 text-sm text-gray-500">
                <p>To get started, edit the page.tsx file.</p>
                <p>Looking for a starting point or more instructions? Head over to Templates or the Learning center.</p>
            </div>
        </main>
    );
}