import { diffDateStringsInDays, getTodayString } from '@/lib/utils'

const PENDING_DAYS_THRESHOLD = 7

export function calculateNextDueDate(paidAt: string, billingFrequency: string | null | undefined): string {
    const [year, month, day] = paidAt.split('-').map(Number)
    const safeFrequency = billingFrequency || 'monthly'

    // Frequencies based on fixed days.
    if (safeFrequency === 'weekly' || safeFrequency === 'biweekly') {
        const daysToAdd = safeFrequency === 'weekly' ? 7 : 14
        const target = new Date(Date.UTC(year, month - 1, day + daysToAdd))
        return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`
    }

    // Month-based frequencies.
    const monthsToAdd = safeFrequency === 'quarterly'
        ? 3
        : safeFrequency === 'biannual'
            ? 6
            : 1

    let targetMonth = month + monthsToAdd
    const targetYear = year + Math.floor((targetMonth - 1) / 12)
    targetMonth = ((targetMonth - 1) % 12) + 1

    const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
    const targetDay = Math.min(day, lastDayOfTargetMonth)

    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

export function calculatePaymentStatus(nextDueDate: string | null): 'paid' | 'pending' | 'overdue' {
    if (!nextDueDate) return 'pending'

    const daysUntilDue = diffDateStringsInDays(nextDueDate, getTodayString())
    if (daysUntilDue < 0) return 'overdue'
    if (daysUntilDue <= PENDING_DAYS_THRESHOLD) return 'pending'
    return 'paid'
}
