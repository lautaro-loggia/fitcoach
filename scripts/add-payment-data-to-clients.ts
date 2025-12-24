/**
 * Script para agregar datos de pago a los clientes existentes
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=')
        envVars[key] = value
    }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const PLAN_NAMES = [
    'Plan Básico',
    'Plan Intermedio',
    'Plan Premium',
    'Plan Personalizado',
]

const PRICES = [15000, 25000, 35000, 45000]

async function addPaymentDataToClients() {
    console.log('🔧 Adding payment data to clients...\n')

    // Get all clients
    const { data: clients, error } = await supabase
        .from('clients')
        .select('id')
        .is('deleted_at', null)

    if (error) {
        console.error('Error fetching clients:', error)
        return
    }

    console.log(`Found ${clients?.length || 0} clients\n`)

    let updated = 0
    const today = new Date()

    for (const client of clients || []) {
        try {
            // Random plan and price
            const planIndex = Math.floor(Math.random() * PLAN_NAMES.length)
            const plan_name = PLAN_NAMES[planIndex]
            const price_monthly = PRICES[planIndex]

            // Random status (70% paid, 20% pending, 10% overdue)
            const rand = Math.random()
            let payment_status: string
            let next_due_date: Date
            let last_paid_at: Date | null = null

            if (rand < 0.7) {
                // Paid - next due date in the future
                payment_status = 'paid'
                const daysUntilDue = Math.floor(Math.random() * 20) + 5 // 5-25 days
                next_due_date = new Date(today)
                next_due_date.setDate(today.getDate() + daysUntilDue)

                // Last payment 5-25 days ago
                last_paid_at = new Date(today)
                last_paid_at.setDate(today.getDate() - daysUntilDue)
            } else if (rand < 0.9) {
                // Pending - due soon
                payment_status = 'pending'
                const daysUntilDue = Math.floor(Math.random() * 5) + 1 // 1-5 days
                next_due_date = new Date(today)
                next_due_date.setDate(today.getDate() + daysUntilDue)
            } else {
                // Overdue - due date in the past
                payment_status = 'overdue'
                const daysOverdue = Math.floor(Math.random() * 10) + 1 // 1-10 days
                next_due_date = new Date(today)
                next_due_date.setDate(today.getDate() - daysOverdue)
            }

            const { error: updateError } = await supabase
                .from('clients')
                .update({
                    plan_name,
                    price_monthly,
                    billing_frequency: 'monthly',
                    payment_status,
                    next_due_date: next_due_date.toISOString().split('T')[0],
                    last_paid_at: last_paid_at ? last_paid_at.toISOString().split('T')[0] : null,
                })
                .eq('id', client.id)

            if (updateError) {
                console.error(`Error updating client ${client.id}:`, updateError)
            } else {
                updated++
                if (updated % 10 === 0) {
                    console.log(`   ✅ Updated ${updated} clients...`)
                }
            }
        } catch (error) {
            console.error(`Error processing client ${client.id}:`, error)
        }
    }

    console.log(`\n🎉 Complete!`)
    console.log(`✅ Updated: ${updated}/${clients?.length || 0} clients`)
}

addPaymentDataToClients().catch(console.error)
