import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 24 * 60 * 60 * 1000

export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires"
const ARGENTINA_UTC_OFFSET_HOURS = -3

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function parseDateOnly(dateString: string): { year: number; month: number; day: number } {
  const match = DATE_ONLY_REGEX.exec(dateString)
  if (!match) {
    throw new Error(`Invalid date-only string: ${dateString}`)
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function formatDateOnlyFromUTC(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns a Date object adjusted to Argentina Time (ART)
 */
export function getARTDate(date: Date = new Date()): Date {
  const dateOnly = getTodayString(date)
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: ARGENTINA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
  const [hour, minute, second] = time.split(':').map(Number)
  const { year, month, day } = parseDateOnly(dateOnly)
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
}

/**
 * Returns today's date string in YYYY-MM-DD format (Argentina Time)
 */
export function getTodayString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Could not format ART date')
  }

  return `${year}-${month}-${day}`
}

export function getARTWeekday(date: Date = new Date(), locale: string = 'es-AR'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: ARGENTINA_TIME_ZONE,
    weekday: 'long',
  }).format(date)
}

export function getNormalizedARTWeekday(date: Date = new Date()): string {
  return normalizeText(getARTWeekday(date))
}

export function getARTHour(date: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: ARGENTINA_TIME_ZONE,
    hour: '2-digit',
    hour12: false,
  }).format(date))
}

export function getARTDayOfWeek(date: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: ARGENTINA_TIME_ZONE,
    weekday: 'short',
  }).format(date)

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  return dayMap[weekday] ?? 0
}

export function formatDateInART(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale: string = 'es-AR'
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(date)
}

export function addDaysToDateString(dateString: string, days: number): string {
  const { year, month, day } = parseDateOnly(dateString)
  const shiftedDate = new Date(Date.UTC(year, month - 1, day + days))
  return formatDateOnlyFromUTC(shiftedDate)
}

export function getMonthStartDateStringART(date: Date = new Date()): string {
  const todayString = getTodayString(date)
  return `${todayString.slice(0, 7)}-01`
}

export function dateOnlyToLocalNoon(dateString: string): Date {
  const { year, month, day } = parseDateOnly(dateString)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

export function compareDateStrings(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

export function diffDateStringsInDays(laterDate: string, earlierDate: string): number {
  const later = parseDateOnly(laterDate)
  const earlier = parseDateOnly(earlierDate)
  const laterUtc = Date.UTC(later.year, later.month - 1, later.day)
  const earlierUtc = Date.UTC(earlier.year, earlier.month - 1, earlier.day)
  return Math.floor((laterUtc - earlierUtc) / MS_PER_DAY)
}

export function getARTDayBounds(referenceDate: Date = new Date()) {
  const today = getTodayString(referenceDate)
  const tomorrow = addDaysToDateString(today, 1)
  const { year, month, day } = parseDateOnly(today)
  const { year: tYear, month: tMonth, day: tDay } = parseDateOnly(tomorrow)

  const start = new Date(Date.UTC(year, month - 1, day, -ARGENTINA_UTC_OFFSET_HOURS, 0, 0, 0))
  const end = new Date(Date.UTC(tYear, tMonth - 1, tDay, -ARGENTINA_UTC_OFFSET_HOURS, 0, 0, 0))

  return {
    date: today,
    nextDate: tomorrow,
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}
