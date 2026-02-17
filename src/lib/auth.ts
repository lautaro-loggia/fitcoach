/**
 * Lista de emails con permisos de administrador.
 * En el futuro se puede migrar a un campo `is_admin` en la tabla `profiles`.
 */
const ADMIN_EMAILS = [
    'lauloggia@gmail.com',
]

/**
 * Verifica si un usuario tiene permisos de administrador.
 */
export function isAdminUser(email: string | undefined | null): boolean {
    if (!email) return false
    return ADMIN_EMAILS.includes(email.toLowerCase())
}
