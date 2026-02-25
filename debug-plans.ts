import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypass RLS for info

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugPlans() {
    const { data: plans, error: planError } = await supabase
        .from('weekly_meal_plans')
        .select('*, days:weekly_meal_plan_days(*, meals:weekly_meal_plan_meals(*))')
        .order('created_at', { ascending: false })
        .limit(2)

    if (planError) {
        console.error('DB Error:', planError)
    } else {
        console.log('Latest Plans:', JSON.stringify(plans, null, 2))
    }
}

debugPlans()
