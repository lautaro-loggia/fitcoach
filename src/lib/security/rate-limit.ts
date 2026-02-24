type RateLimitBucket = {
    count: number
    resetAt: number
    lastSeen: number
}

type RateLimitStore = Map<string, RateLimitBucket>

type RateLimitInput = {
    scope: string
    key: string
    maxRequests: number
    windowMs: number
}

type RateLimitResult = {
    allowed: boolean
    retryAfterMs: number
    remaining: number
}

const MAX_STORED_KEYS = 5000

function getStore(): RateLimitStore {
    const globalWithStore = globalThis as typeof globalThis & {
        __orbitRateLimitStore?: RateLimitStore
    }

    if (!globalWithStore.__orbitRateLimitStore) {
        globalWithStore.__orbitRateLimitStore = new Map<string, RateLimitBucket>()
    }

    return globalWithStore.__orbitRateLimitStore
}

function pruneStore(store: RateLimitStore, now: number) {
    if (store.size < MAX_STORED_KEYS && Math.random() > 0.02) {
        return
    }

    for (const [bucketKey, bucket] of store.entries()) {
        // Remove expired or stale buckets to bound memory.
        if (bucket.resetAt <= now || now - bucket.lastSeen > 24 * 60 * 60 * 1000) {
            store.delete(bucketKey)
        }
    }
}

export function consumeRateLimit(input: RateLimitInput): RateLimitResult {
    const now = Date.now()
    const store = getStore()
    const bucketKey = `${input.scope}:${input.key}`
    const existing = store.get(bucketKey)

    if (!existing || now >= existing.resetAt) {
        store.set(bucketKey, {
            count: 1,
            resetAt: now + input.windowMs,
            lastSeen: now,
        })
        pruneStore(store, now)
        return {
            allowed: true,
            retryAfterMs: 0,
            remaining: Math.max(0, input.maxRequests - 1),
        }
    }

    existing.lastSeen = now

    if (existing.count >= input.maxRequests) {
        pruneStore(store, now)
        return {
            allowed: false,
            retryAfterMs: Math.max(0, existing.resetAt - now),
            remaining: 0,
        }
    }

    existing.count += 1
    store.set(bucketKey, existing)
    pruneStore(store, now)

    return {
        allowed: true,
        retryAfterMs: 0,
        remaining: Math.max(0, input.maxRequests - existing.count),
    }
}

