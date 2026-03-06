import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Ez a route SZERVER-OLDALON fut, a Service Role kulcs nem jut el a böngészőbe!
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Szerver-oldali env, nem publikus
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET: Összes felhasználó provider info-ja (auth.users táblából)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const requestingUserId = searchParams.get('requestingUserId');

        if (!requestingUserId) {
            return NextResponse.json({ error: 'Hiányzó requestingUserId.' }, { status: 400 });
        }

        // Admin ellenőrzés
        const { data: userRoles, error: urError } = await supabaseAdmin
            .from('user_roles').select('role_id').eq('user_id', requestingUserId);

        if (urError) {
            console.error("UR Error Details:", JSON.stringify(urError, null, 2));
            console.error("Service Role Key exists?", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        }

        const roleIds = userRoles?.map((ur: any) => ur.role_id) || [];
        if (roleIds.length === 0) {
            return NextResponse.json({ error: 'Nincs jogosultságod.' }, { status: 403 });
        }

        const { data: adminRole, error: roleError } = await supabaseAdmin
            .from('roles').select('id').eq('name', 'Admin').in('id', roleIds).maybeSingle();

        if (roleError) console.error("Role Error:", roleError);

        if (!adminRole) {
            return NextResponse.json({ error: 'Nincs jogosultságod.' }, { status: 403 });
        }

        // auth.users lekérdezése (Service Role szükséges)
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Csak a szükséges mezőket adjuk vissza
        const providerMap = users.map(u => ({
            id: u.id,
            email: u.email,
            provider: u.app_metadata?.provider || 'email',
            providers: u.app_metadata?.providers || [u.app_metadata?.provider || 'email'],
            last_sign_in_at: u.last_sign_in_at,
            created_at: u.created_at,
        }));

        return NextResponse.json({ users: providerMap });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Ismeretlen hiba' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { userIdToDelete, deleteEvents, requestingUserId } = body;

        if (!userIdToDelete || !requestingUserId) {
            return NextResponse.json({ error: 'Hiányzó paraméterek.' }, { status: 400 });
        }

        // 1. Ellenőrizzük, hogy a kérelmező valóban Admin-e (kétlépéses, megbízható)
        const { data: userRolesData } = await supabaseAdmin
            .from('user_roles')
            .select('role_id')
            .eq('user_id', requestingUserId);

        if (!userRolesData?.length) {
            return NextResponse.json({ error: 'Nincs jogosultságod ehhez a művelethez.' }, { status: 403 });
        }
        const roleIds = userRolesData.map((ur: any) => ur.role_id);

        const { data: adminRole } = await supabaseAdmin
            .from('roles')
            .select('id')
            .eq('name', 'Admin')
            .in('id', roleIds)
            .maybeSingle();

        if (!adminRole) {
            return NextResponse.json({ error: 'Nincs jogosultságod ehhez a művelethez.' }, { status: 403 });
        }

        // 2. Biztonsági ellenőrzés: Admin nem törölheti saját magát
        if (userIdToDelete === requestingUserId) {
            return NextResponse.json({ error: 'Saját magadat nem törölheted!' }, { status: 400 });
        }

        // 3. Ha kérés volt az események törlésére
        if (deleteEvents) {
            await supabaseAdmin.from('event_attendees').delete().in('event_id',
                supabaseAdmin.from('events').select('id').eq('created_by', userIdToDelete) as any
            );
            await supabaseAdmin.from('events').delete().eq('created_by', userIdToDelete);
        }

        // 4. Kapcsolódó jogosultság táblák tisztítása
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userIdToDelete);
        await supabaseAdmin.from('event_attendees').delete().eq('user_id', userIdToDelete);
        await supabaseAdmin.from('profiles').delete().eq('id', userIdToDelete);

        // 5. A Supabase Auth-ból is töröljük (Service Role szükséges!)
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

        if (deleteAuthError) {
            return NextResponse.json({ error: 'Auth törlési hiba: ' + deleteAuthError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Ismeretlen hiba' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { userIdToUpdate, requestingUserId, displayName, avatarUrl, theme } = body;

        // DEBUG - törölhető ha m\u0171k\u00f6dik
        console.log('[PATCH /api/admin/user] requestingUserId:', requestingUserId, '| userIdToUpdate:', userIdToUpdate);
        console.log('[PATCH] SERVICE_ROLE_KEY l\u00e9tezik:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

        if (!userIdToUpdate || !requestingUserId) {
            return NextResponse.json({ error: 'Hiányzó paraméterek.' }, { status: 400 });
        }

        // Admin ellenőrzés (kétlépéses, megbízható)
        const { data: patchUserRoles } = await supabaseAdmin
            .from('user_roles')
            .select('role_id')
            .eq('user_id', requestingUserId);

        if (!patchUserRoles?.length) {
            return NextResponse.json({ error: 'Nincs jogosultságod ehhez a művelethez.' }, { status: 403 });
        }
        const patchRoleIds = patchUserRoles.map((ur: any) => ur.role_id);

        const { data: patchAdminRole } = await supabaseAdmin
            .from('roles')
            .select('id')
            .eq('name', 'Admin')
            .in('id', patchRoleIds)
            .maybeSingle();

        if (!patchAdminRole) {
            return NextResponse.json({ error: 'Nincs jogosultságod ehhez a művelethez.' }, { status: 403 });
        }

        // Profiles tábla frissítése
        await supabaseAdmin.from('profiles').update({
            display_name: displayName,
            avatar_url: avatarUrl,
        }).eq('id', userIdToUpdate);

        // Auth user_metadata frissítése (Admin nevében)
        await supabaseAdmin.auth.admin.updateUserById(userIdToUpdate, {
            user_metadata: { display_name: displayName, avatar_url: avatarUrl, theme }
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Ismeretlen hiba' }, { status: 500 });
    }
}
