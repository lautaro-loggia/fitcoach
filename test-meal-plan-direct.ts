import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! 

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
    const clientId = 'e26bad99-a003-497b-8973-642eeb373f29'
    const mealConfig = ['Desayuno', 'Almuerzo']
    console.log('Testing createWeeklyPlan admin logic...')
    
    // 1. Create Plan
    const { data: plan, error: planError } = await adminSupabase
        .from('weekly_meal_plans')
        .insert({ client_id: clientId })
        .select()
        .single()

    if (planError) {
        console.error('Error creando plan:', planError)
        return
    }
    
    console.log('Plan created:', plan.id)

    // 2. Create Days (1-7)
    const daysToInsert = Array.from({ length: 7 }, (_, i) => ({
        plan_id: plan.id,
        day_of_week: i + 1
    }))

    const { data: days, error: daysError } = await adminSupabase
        .from('weekly_meal_plan_days')
        .insert(daysToInsert)
        .select()

    if (daysError) {
        console.error('Error creando días:', daysError)
        return
    }
    console.log('Days created:', days.length)

    // 3. Create Meals for each day
    const mealsToInsert: any[] = []

    days.forEach(day => {
        mealConfig.forEach((mealName, index) => {
            mealsToInsert.push({
                day_id: day.id,
                name: mealName,
                sort_order: index
            })
        })
    })

    const { error: mealsError } = await adminSupabase
        .from('weekly_meal_plan_meals')
        .insert(mealsToInsert)

    if (mealsError) {
        console.error('Error configurando comidas:', mealsError)
        return
    }
    console.log('Meals created, success!')
}
test()
