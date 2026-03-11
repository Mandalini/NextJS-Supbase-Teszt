'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/app/hooks/usePermissions';

export default function RolesPage() {
    const router = useRouter();
    const { loading: permsLoading, permissions: userPermissions } = usePermissions();

    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [rolePermissions, setRolePermissions] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [providerMap, setProviderMap] = useState<Record<string, string>>({});

    // Szűrők
    const [filterName, setFilterName] = useState('');
    const [filterEmail, setFilterEmail] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');

    // Frissítjük a bejelentkezett user last_seen_at mezőjét
    useEffect(() => {
        supabase.auth.getUser().then(async ({ data }) => {
            if (data?.user) {
                setCurrentUserId(data.user.id);
                await supabase
                    .from('profiles')
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq('id', data.user.id);

                // Provider info betöltése (API route-on keresztül)
                fetch(`/api/admin/user?requestingUserId=${data.user.id}`)
                    .then(r => r.json())
                    .then(res => {
                        console.log("Provider API válasz:", res);
                        if (res.users) {
                            const map: Record<string, string> = {};
                            res.users.forEach((u: any) => { map[u.id] = u.provider; });
                            console.log("Provider Map:", map);
                            setProviderMap(map);
                        } else if (res.error) {
                            console.error("Provider API hiba:", res.error);
                        }
                    })
                    .catch(err => {
                        console.error("Provider API fetch hiba:", err);
                    });
            }
        });
    }, []);

    useEffect(() => {
        if (permsLoading) return;

        // A hasPermission() f\u00fcggv\u00e9ny minden render-ciklusban \u00faj referenci\u00e1t kap,
        // ez\u00e9rt NEM ker\u00fcl a dependency t\u00f6mbje. Helyette a permissions t\u00f6mb \u00e9rt\u00e9k\u00e9t n\u00e9zz\u00fck k\u00f6zvetlen\u00fcl.
        const canManageRoles = userPermissions.some((p: any) => p.action === 'manage_roles');

        if (!canManageRoles) {
            router.push('/dashboard');
        } else {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permsLoading, userPermissions, router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch users with their roles map
            const { data: profiles, error: profError } = await supabase
                .from('profiles')
                .select('id, email, display_name, avatar_url, last_seen_at')
                .order('email', { ascending: true });

            const { data: userRolesData, error: urError } = await supabase
                .from('user_roles')
                .select('*');

            // Merge profiles with their roles
            const mergedUsers = profiles?.map(p => ({
                ...p,
                role_ids: userRolesData?.filter(ur => ur.user_id === p.id).map(ur => ur.role_id) || []
            })) || [];

            setUsers(mergedUsers);

            // Fetch roles
            const { data: rolesData, error: rolesError } = await supabase
                .from('roles')
                .select('*')
                .order('name');
            setRoles(rolesData || []);

            // Fetch permissions
            const { data: permsData, error: permsError } = await supabase
                .from('permissions')
                .select('*')
                .order('action');
            setPermissions(permsData || []);

            // Fetch role matrix
            const { data: rpData, error: rpError } = await supabase
                .from('role_permissions')
                .select('*');
            setRolePermissions(rpData || []);

            // Supabase error objektum ures {} is lehet, .message-gel ellenőrizzük
            const hasError = [profError, rolesError, permsError, rpError].some(e => e?.message);
            if (hasError) {
                console.error("Error fetching data:", profError?.message, rolesError?.message, permsError?.message, rpError?.message);
            }
        } catch (error) {
            console.error('Unexpected error fetching roles data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserRoleChange = async (userId: string, roleId: string, hasRoleNow: boolean) => {
        try {
            if (hasRoleNow) {
                // Removing role
                await supabase
                    .from('user_roles')
                    .delete()
                    .match({ user_id: userId, role_id: roleId });
            } else {
                // Adding role
                await supabase
                    .from('user_roles')
                    .insert({ user_id: userId, role_id: roleId });
            }
            fetchData();
        } catch (err) {
            console.error('Error modifying user roles', err);
        }
    };

    const handleRolePermissionChange = async (roleId: string, permissionId: string, hasPermNow: boolean) => {
        try {
            if (hasPermNow) {
                // Removing perm
                await supabase
                    .from('role_permissions')
                    .delete()
                    .match({ role_id: roleId, permission_id: permissionId });
            } else {
                // Adding perm
                await supabase
                    .from('role_permissions')
                    .insert({ role_id: roleId, permission_id: permissionId });
            }
            fetchData();
        } catch (err) {
            console.error('Error modifying role permissions', err);
        }
    };

    if (permsLoading || loading) {
        return <div className="p-8 text-center text-gray-500 glow-text min-h-screen flex items-center justify-center">Adatok betöltése...</div>;
    }

    const canManageRoles = userPermissions.some((p: any) => p.action === 'manage_roles');
    if (!canManageRoles) {
        return null;
    }

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen text-white">
            <div className="flex flex-col mb-10 gap-4">
                <Link href="/dashboard" className="self-start px-5 py-2.5 glass-panel text-white hover:bg-white/10 rounded-xl transition-all glow-border text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 mb-4">
                    <span>&larr;</span> Vissza a Vezérlőpultra
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extralight tracking-wider">FELHASZNÁLÓK <span className="text-gold font-bold glow-text">KEZELÉSE</span></h1>
                        <p className="text-gray-400 text-sm font-light mt-2">
                            Szerepkörök és jogosultságok dinamikus kezelése a Szerepkör-mátrix segítségével.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabok */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'users'
                        ? 'bg-brand-blue text-white shadow-[0_0_15px_var(--color-brand-blue)] border border-brand-blue'
                        : 'bg-black/40 text-gray-400 hover:text-white border border-white/10'
                        }`}
                >
                    Felhasználók
                </button>
                <button
                    onClick={() => setActiveTab('matrix')}
                    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'matrix'
                        ? 'bg-brand-blue text-white shadow-[0_0_15px_var(--color-brand-blue)] border border-brand-blue'
                        : 'bg-black/40 text-gray-400 hover:text-white border border-white/10'
                        }`}
                >
                    Szerepkör-Mátrix
                </button>
            </div>

            {activeTab === 'users' && (
                <div className="glass-panel p-6 rounded-2xl glow-border">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Felhasználók Szerepkörei</h2>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse"></span>
                            Aktív = 5 percen belül bejelentkezett
                        </div>
                    </div>

                    {/* Szűrők */}
                    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-black/20 rounded-xl border border-white/5">
                        <input
                            type="text"
                            placeholder="Szűrés név szerint..."
                            value={filterName}
                            onChange={e => setFilterName(e.target.value)}
                            className="flex-1 min-w-[160px] bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-blue transition-colors placeholder-gray-600"
                        />
                        <input
                            type="text"
                            placeholder="Szűrés email szerint..."
                            value={filterEmail}
                            onChange={e => setFilterEmail(e.target.value)}
                            className="flex-1 min-w-[160px] bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-blue transition-colors placeholder-gray-600"
                        />
                        {/* Szerepkör szűrő - custom dropdown ThemeSwitcher stílusban */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setRoleDropdownOpen(o => !o)}
                                className="inline-flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-300 bg-black/40 border border-white/10 rounded-lg hover:bg-white/5 hover:border-brand-blue/40 transition-colors min-w-[160px]"
                            >
                                <span>{filterRole ? roles.find(r => r.id === filterRole)?.name : 'Minden szerepkör'}</span>
                                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {roleDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)}></div>
                                    <div className="absolute top-full left-0 mt-1 w-48 z-50 rounded-xl shadow-2xl glass-panel border border-brand-blue/30 overflow-hidden backdrop-blur-xl">
                                        <button
                                            type="button"
                                            onClick={() => { setFilterRole(''); setRoleDropdownOpen(false); }}
                                            className={`block w-full text-left px-4 py-3 text-xs uppercase tracking-widest font-bold transition-colors ${!filterRole ? 'bg-brand-blue/20 text-brand-blue border-l-4 border-brand-blue' : 'text-gray-300 hover:bg-white/10 hover:text-white border-l-4 border-transparent'}`}
                                        >
                                            Minden szerepkör
                                        </button>
                                        {roles.map(r => (
                                            <button
                                                key={r.id}
                                                type="button"
                                                onClick={() => { setFilterRole(r.id); setRoleDropdownOpen(false); }}
                                                className={`block w-full text-left px-4 py-3 text-xs uppercase tracking-widest font-bold transition-colors ${filterRole === r.id ? 'bg-brand-blue/20 text-brand-blue border-l-4 border-brand-blue' : 'text-gray-300 hover:bg-white/10 hover:text-white border-l-4 border-transparent'}`}
                                            >
                                                {r.name}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        {(filterName || filterEmail || filterRole) && (
                            <button
                                onClick={() => { setFilterName(''); setFilterEmail(''); setFilterRole(''); }}
                                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors uppercase tracking-widest font-bold"
                            >
                                Törlés
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/10 text-sm border-collapse">
                            <thead className="bg-black/40">
                                <tr>
                                    <th className="px-6 py-4 text-left font-bold text-gray-400 uppercase tracking-widest text-[10px]">Felhasználó / Stát.</th>
                                    {roles.map(role => (
                                        <th key={role.id} className="px-6 py-4 text-center font-bold text-brand-blue uppercase tracking-widest text-[10px]">
                                            {role.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users
                                    .filter(user => {
                                        const nameMatch = !filterName || (user.display_name || '').toLowerCase().includes(filterName.toLowerCase());
                                        const emailMatch = !filterEmail || (user.email || '').toLowerCase().includes(filterEmail.toLowerCase());
                                        const roleMatch = !filterRole || user.role_ids.includes(filterRole);
                                        return nameMatch && emailMatch && roleMatch;
                                    })
                                    .map(user => {
                                        const isCurrentUser = user.id === currentUserId;
                                        const lastSeen = user.last_seen_at ? new Date(user.last_seen_at) : null;
                                        const isActive = lastSeen && (new Date().getTime() - lastSeen.getTime()) < 5 * 60 * 1000;
                                        return (
                                            <tr key={user.id} className={`transition-colors ${isCurrentUser ? 'bg-brand-blue/10 ring-1 ring-inset ring-brand-blue/30' : 'hover:bg-white/5'}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3">
                                                        {/* Aktív jelző */}
                                                        <div className="mt-1 flex-shrink-0">
                                                            <div title={isActive ? 'Aktív az elmúlt 5 percben' : (lastSeen ? `Utoljára látva: ${lastSeen.toLocaleString('hu-HU')}` : 'Soha nem lépett be')} className={`w-2.5 h-2.5 rounded-full border-2 ${isActive ? 'bg-green-400 border-green-300 shadow-[0_0_6px_#4ade80]' : 'bg-gray-700 border-gray-600'}`}></div>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-white">{user.display_name || 'Névtelen'}</span>
                                                                {isCurrentUser && (
                                                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-brand-blue/30 text-brand-blue border border-brand-blue/50 px-2 py-0.5 rounded-full">Te</span>
                                                                )}
                                                                {providerMap[user.id] === 'google' && (
                                                                    <span className="text-[9px] font-bold tracking-widest bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1" title="Google bejelentkezés">
                                                                        G Google
                                                                    </span>
                                                                )}
                                                                {providerMap[user.id] === 'email' && (
                                                                    <span className="text-[9px] font-bold tracking-widest bg-gray-500/10 text-gray-400 border border-gray-500/30 px-2 py-0.5 rounded-full flex items-center gap-1" title="Email / Jelszó bejelentkezés">
                                                                        ✉️ Email
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-gray-500 font-mono text-xs">{user.email}</div>
                                                            {lastSeen && !isActive && (
                                                                <div className="text-gray-600 text-[10px] mt-0.5">Utoljára: {lastSeen.toLocaleString('hu-HU')}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-1 pl-5 flex flex-col gap-1">
                                                        <Link
                                                            href={`/dashboard/admin-edit-profile/${user.id}`}
                                                            className="text-[9px] uppercase tracking-widest text-gold/70 hover:text-gold transition-colors font-bold"
                                                        >
                                                            Profil szerkesztése →
                                                        </Link>
                                                        <Link
                                                            href={`/szervezo/${user.id}`}
                                                            className="text-[9px] uppercase tracking-widest text-brand-blue/70 hover:text-brand-blue transition-colors font-bold"
                                                        >
                                                            Bemutatkozó oldal →
                                                        </Link>
                                                    </div>
                                                </td>
                                                {roles.map(role => {
                                                    const hasRole = user.role_ids.includes(role.id);
                                                    return (
                                                        <td key={role.id} className="px-6 py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={hasRole}
                                                                onChange={() => handleUserRoleChange(user.id, role.id, hasRole)}
                                                                className="w-5 h-5 rounded cursor-pointer accent-brand-blue"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'matrix' && (
                <div className="glass-panel p-6 rounded-2xl glow-border">
                    <h2 className="text-xl font-bold mb-6 text-white uppercase tracking-wider">Szerepkörök és Engedélyek</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/10 text-sm border-collapse">
                            <thead className="bg-black/40">
                                <tr>
                                    <th className="px-6 py-4 text-left font-bold text-gray-400 uppercase tracking-widest text-[10px] w-1/3">Jogosultság (Action)</th>
                                    {roles.map(role => (
                                        <th key={role.id} className="px-6 py-4 text-center font-bold text-brand-blue uppercase tracking-widest text-[10px]">
                                            {role.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {permissions.map(perm => (
                                    <tr key={perm.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white uppercase text-xs tracking-wider">{perm.action}</div>
                                            <div className="text-gray-500 text-xs mt-1">{perm.description}</div>
                                        </td>
                                        {roles.map(role => {
                                            const hasPerm = rolePermissions.some(rp => rp.role_id === role.id && rp.permission_id === perm.id);
                                            return (
                                                <td key={role.id} className="px-6 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={hasPerm}
                                                        onChange={() => handleRolePermissionChange(role.id, perm.id, hasPerm)}
                                                        className="w-5 h-5 rounded cursor-pointer accent-brand-blue bg-black/50 border border-white/20"
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
