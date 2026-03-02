export interface MotionRouteBudget {
    maxAnimatedItems: number
    staggerChildren: number
    maxSimultaneousSections: number
    enableScrollReveal: boolean
}

const defaultBudget: MotionRouteBudget = {
    maxAnimatedItems: 6,
    staggerChildren: 0.035,
    maxSimultaneousSections: 3,
    enableScrollReveal: true
}

const routeBudgets: Array<{ match: (pathname: string) => boolean; budget: MotionRouteBudget }> = [
    {
        match: (pathname) => pathname === '/' || pathname === '/dashboard',
        budget: {
            maxAnimatedItems: 8,
            staggerChildren: 0.04,
            maxSimultaneousSections: 4,
            enableScrollReveal: true
        }
    },
    {
        match: (pathname) => pathname.startsWith('/clients') || pathname.startsWith('/dashboard/workout'),
        budget: {
            maxAnimatedItems: 8,
            staggerChildren: 0.03,
            maxSimultaneousSections: 3,
            enableScrollReveal: true
        }
    },
    {
        match: (pathname) => pathname.startsWith('/dashboard/diet') || pathname.startsWith('/dashboard/progress'),
        budget: {
            maxAnimatedItems: 6,
            staggerChildren: 0.03,
            maxSimultaneousSections: 3,
            enableScrollReveal: true
        }
    },
    {
        match: (pathname) => pathname.startsWith('/settings') || pathname.startsWith('/auth'),
        budget: {
            maxAnimatedItems: 4,
            staggerChildren: 0.02,
            maxSimultaneousSections: 2,
            enableScrollReveal: false
        }
    }
]

export function getMotionRouteBudget(pathname?: string): MotionRouteBudget {
    if (!pathname) return defaultBudget

    const match = routeBudgets.find((entry) => entry.match(pathname))
    if (!match) return defaultBudget

    return match.budget
}
