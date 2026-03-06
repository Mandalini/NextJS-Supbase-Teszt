import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserRole {
    id: string;
    name: string;
}

export interface UserPermission {
    id: string;
    action: string;
}

export function usePermissions() {
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [permissions, setPermissions] = useState<UserPermission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchPermissions() {
            try {
                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError || !userData?.user) {
                    if (isMounted) setLoading(false);
                    return;
                }

                const userId = userData.user.id;

                // 1. Get Roles
                const { data: userRolesData, error: rolesError } = await supabase
                    .from('user_roles')
                    .select('role_id, roles(id, name)')
                    .eq('user_id', userId);

                if (rolesError) {
                    console.error('Error fetching roles:', rolesError);
                    if (isMounted) setLoading(false);
                    return;
                }

                const fetchedRoles: UserRole[] = userRolesData
                    ?.map((ur: any) => ur.roles)
                    .filter(Boolean) || [];

                if (isMounted) {
                    setRoles(fetchedRoles);
                }

                // 2. Get Permissions for all those roles
                if (fetchedRoles.length > 0) {
                    const roleIds = fetchedRoles.map(r => r.id);
                    const { data: rolePermsData, error: permsError } = await supabase
                        .from('role_permissions')
                        .select('permission_id, permissions(id, action)')
                        .in('role_id', roleIds);

                    if (permsError) {
                        console.error('Error fetching permissions:', permsError);
                    } else {
                        const fetchedPermissions: UserPermission[] = rolePermsData
                            ?.map((rp: any) => rp.permissions)
                            .filter(Boolean) || [];

                        // Deduplicate permissions
                        const uniquePermsMap = new Map();
                        fetchedPermissions.forEach(p => uniquePermsMap.set(p.action, p));

                        if (isMounted) {
                            setPermissions(Array.from(uniquePermsMap.values()));
                        }
                    }
                }
            } catch (err) {
                console.error('Unexpected error in fetchPermissions:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchPermissions();

        return () => {
            isMounted = false;
        };
    }, []);

    const hasPermission = (action: string) => {
        return permissions.some(p => p.action === action);
    };

    const hasRole = (roleName: string) => {
        return roles.some(r => r.name === roleName);
    };

    return {
        roles,
        permissions,
        loading,
        hasPermission,
        hasRole
    };
}
