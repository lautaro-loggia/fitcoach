'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { buildAuthCallbackUrl } from '@/lib/base-url'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // validate fields
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Por favor complete todos los campos' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: 'Credenciales inválidas' }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()
    const callbackUrl = await buildAuthCallbackUrl()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!email || !password || !fullName || !confirmPassword) {
        return { error: 'Por favor complete todos los campos' }
    }

    if (password !== confirmPassword) {
        return { error: 'Las contraseñas no coinciden' }
    }

    if (password.length < 6) {
        return { error: 'La contraseña debe tener al menos 6 caracteres' }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                needs_password: false
            },
            emailRedirectTo: callbackUrl,
        },
    })

    // Also create profile if signup successful? 
    // Triggers in SQL are better for this to ensure consistency, but we can do it here too if needed.
    // The SQL schema has "create table profiles references auth.users".
    // Usually a trigger on auth.users insert is best.
    // For MVP, I'll rely on a trigger OR manual insertion.
    // The User requirement said: "Al registrarse: Se crea el usuario en Supabase Auth. Se crea el perfil de entrenador."

    // Let's rely on a Trigger for robustness, OR do it manually here.
    // Manual is safer if we don't want to mess with SQL Triggers right now without an editor.
    // But wait, RLS allows "Users can insert own profile". So we can do it here.

    if (error) {
        return { error: error.message }
    }

    // Profile is now created automatically via database trigger (handle_new_user)

    // User spec: "Se redirige al Dashboard vacío."
    // Depends on email confirmation. "Email verification: sí".
    // If email verification is on, they won't be able to login immediately?
    // Or they can login but have limited access?
    // Usually redirects to a "Check your email" page.
    // But the prompt says "Redirects: Logged in -> /dashboard". 
    // If auto-confirm is off (default), they can't login.
    // I will assume for now I should redirect to dashboard, hoping Supabase project config allows it or handles it gracefully. 
    // Actually, standard flow with email verification is to show a message.
    // I'll redirect to a verify-email page or show a message?
    // Spec says: "Al registrarse: ... Se redirige al Dashboard vacío." 
    // This implies implicit login or auto-confirm.
    // OR the user meant "After they confirm and login".
    // I'll try to redirect to dashboard. If session is null (cause unverified), middleware might toggle them back.

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function requestPasswordReset(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const redirectUrl = await buildAuthCallbackUrl('/reset-password')

    if (!email) {
        return { error: 'Por favor ingrese su correo electrónico' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
        return { error: 'Por favor complete todos los campos' }
    }

    if (password !== confirmPassword) {
        return { error: 'Las contraseñas no coinciden' }
    }

    const { error } = await supabase.auth.updateUser({
        password: password,
        data: { needs_password: false }
    })

    if (error) {
        return { error: error.message }
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (user) {
        const { data: client } = await supabase
            .from('clients')
            .select('onboarding_status')
            .eq('user_id', user.id)
            .maybeSingle()

        if (client) {
            revalidatePath('/', 'layout')
            redirect(client.onboarding_status === 'completed' ? '/dashboard' : '/onboarding')
        }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}
