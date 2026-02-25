import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! 

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
    const clientId = 'e26bad99-a003-497b-8973-642eeb373f29'
    
    // Attempt to fetch existing active plan
    const { data: plan, error } = await adminSupabase
        .from('weekly_meal_plans')
        .select(`
            *,
            days:weekly_meal_plan_days(
                *,
                meals:weekly_meal_plan_meals(
                    *,
                    items:weekly_meal_plan_items(
                        *,
                        recipe:recipes(*)
                    )
                )
            )
        `)
        .eq('client_id', clientId)
        .eq('status', 'active')
        .single()
    
    console.log('Error:', error)
    console.log('Plan:', plan ? 'Found' : 'Null', plan?.id)
}
test()
