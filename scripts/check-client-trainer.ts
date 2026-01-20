
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTrainer() {
    const clientEmail = 'test.reverify@orbit.coach';
    console.log(`Checking trainer for client: ${clientEmail}`);

    // 1. Get Client
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, full_name, trainer_id')
        .eq('email', clientEmail)
        .single();

    if (clientError || !client) {
        console.error('Client not found:', clientError);
        return;
    }

    console.log(`Client Found: ${client.full_name} (ID: ${client.id})`);
    console.log(`Trainer ID: ${client.trainer_id}`);

    // 2. Get Trainer Profile
    const { data: trainerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', client.trainer_id)
        .single();

    if (profileError) {
        console.log('Trainer profile not found in public.profiles. Checking auth users...');
        // Fallback? Admin list users to find email if not in profile, but mostly profiles exists.
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(client.trainer_id);
        if (user) {
            console.log(`Trainer User Found (Auth): ${user.email}`);
        } else {
            console.error('Trainer not found in Auth either.');
        }
    } else {
        console.log(`Trainer Profile Found:`);
        console.log(`Name: ${trainerProfile.full_name}`);
        console.log(`Email: ${trainerProfile.email}`);
    }
}

checkTrainer();
