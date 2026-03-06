require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function test() {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log("Key length:", process.env.SUPABASE_SERVICE_ROLE_KEY.length);
    const { data, error } = await supabaseAdmin.from('user_roles').select('role_id').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success:", data);
    }
}
test();
