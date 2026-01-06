/**
 * Utility functions for determining progress indicator colors
 * based on client goals and actual changes.
 */

export type ProgressColorResult = 'green' | 'red' | 'gray'

export interface ProgressColorClasses {
    badge: string
    text: string
}

/**
 * Mapping of color results to Tailwind classes
 */
export const progressColorClasses: Record<ProgressColorResult, ProgressColorClasses> = {
    green: {
        badge: 'bg-green-100 text-green-700',
        text: 'text-green-700'
    },
    red: {
        badge: 'bg-red-100 text-red-700',
        text: 'text-red-700'
    },
    gray: {
        badge: 'bg-gray-100 text-gray-600',
        text: 'text-gray-600'
    }
}

/**
 * Determines the color for weight change indicator based on client goals.
 * 
 * @param weightDiff - The difference between current and previous weight (positive = gained, negative = lost)
 * @param targetWeight - The client's target weight (optional)
 * @param initialWeight - The client's initial/starting weight (optional)
 * @param goalSpecific - The client's specific goal type (optional)
 * @returns 'green' if progressing toward goal, 'red' if moving away, 'gray' if no change
 */
export function getWeightProgressColor(
    weightDiff: number,
    targetWeight?: number | null,
    initialWeight?: number | null,
    goalSpecific?: string | null
): ProgressColorResult {
    // No change = gray
    if (weightDiff === 0) return 'gray'

    const gained = weightDiff > 0
    const lost = weightDiff < 0

    // If we have a target weight and initial weight, use those to determine direction
    if (targetWeight != null && initialWeight != null) {
        const shouldGainWeight = targetWeight > initialWeight
        const shouldLoseWeight = targetWeight < initialWeight

        if (shouldGainWeight) {
            // Goal is to gain weight
            return gained ? 'green' : 'red'
        } else if (shouldLoseWeight) {
            // Goal is to lose weight
            return lost ? 'green' : 'red'
        } else {
            // Target equals initial (maintenance)
            return 'gray'
        }
    }

    // Fallback: use goal_specific if target weight is not available
    if (goalSpecific) {
        switch (goalSpecific) {
            case 'gain_muscle':
            case 'increase_strength':
                // These goals typically involve gaining weight
                return gained ? 'green' : 'red'

            case 'lose_weight':
                // Goal is to lose weight
                return lost ? 'green' : 'red'

            case 'maintenance':
            case 'improve_endurance':
                // Neutral - no specific weight direction
                return 'gray'

            default:
                // Unknown goal, default to old behavior (gaining = red)
                return gained ? 'red' : 'green'
        }
    }

    // No goal information available, default to old behavior
    return gained ? 'red' : 'green'
}

/**
 * Determines the color for body fat change indicator based on client goals.
 * 
 * @param fatDiff - The difference between current and previous body fat (positive = gained, negative = lost)
 * @param targetFat - The client's target body fat percentage (optional)
 * @param initialFat - The client's initial body fat percentage (optional)
 * @param goalSpecific - The client's specific goal type (optional)
 * @returns 'green' if progressing toward goal, 'red' if moving away, 'gray' if no change
 */
export function getBodyFatProgressColor(
    fatDiff: number,
    targetFat?: number | null,
    initialFat?: number | null,
    goalSpecific?: string | null
): ProgressColorResult {
    // No change = gray
    if (fatDiff === 0) return 'gray'

    const gained = fatDiff > 0
    const lost = fatDiff < 0

    // If we have target and initial fat, use those
    if (targetFat != null && initialFat != null) {
        const shouldLoseFat = targetFat < initialFat
        const shouldGainFat = targetFat > initialFat

        if (shouldLoseFat) {
            // Goal is to lose fat
            return lost ? 'green' : 'red'
        } else if (shouldGainFat) {
            // Goal is to gain fat (rare, but possible)
            return gained ? 'green' : 'red'
        } else {
            // Target equals initial (maintenance)
            return 'gray'
        }
    }

    // Fallback: use goal_specific
    if (goalSpecific) {
        switch (goalSpecific) {
            case 'lose_weight':
            case 'gain_muscle':
                // Both typically want to lose/maintain low body fat
                return lost ? 'green' : 'red'

            case 'maintenance':
            case 'improve_endurance':
            case 'increase_strength':
                // Neutral for body fat
                return 'gray'

            default:
                // Default: losing fat is generally positive
                return lost ? 'green' : 'red'
        }
    }

    // No goal information, default to losing fat = good
    return lost ? 'green' : 'red'
}
