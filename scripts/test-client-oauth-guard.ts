import assert from 'node:assert/strict'
import {
    CLIENT_OAUTH_GUARD_MESSAGES,
    validateClientOAuthAccess,
} from '@/lib/auth-callback-client-guard'

type GuardDeps = Parameters<typeof validateClientOAuthAccess>[0]

function createDeps(overrides: Partial<GuardDeps> = {}): GuardDeps {
    return {
        linkClientByEmail: async () => ({ error: null }),
        lookupLinkedClients: async () => ({
            data: [{ id: 'client-1', onboarding_status: 'invited' }],
            count: 1,
            error: null,
        }),
        signOut: async () => { },
        ...overrides,
    }
}

async function run() {
    {
        let signOutCalls = 0
        const result = await validateClientOAuthAccess(
            createDeps({
                lookupLinkedClients: async () => ({
                    data: null,
                    count: null,
                    error: new Error('db failed'),
                }),
                signOut: async () => {
                    signOutCalls += 1
                },
            })
        )

        assert.equal(result.allowed, false)
        if (!result.allowed) {
            assert.equal(result.message, CLIENT_OAUTH_GUARD_MESSAGES.lookupError)
        }
        assert.equal(signOutCalls, 1)
    }

    {
        let signOutCalls = 0
        const result = await validateClientOAuthAccess(
            createDeps({
                lookupLinkedClients: async () => ({
                    data: [],
                    count: 0,
                    error: null,
                }),
                signOut: async () => {
                    signOutCalls += 1
                },
            })
        )

        assert.equal(result.allowed, false)
        if (!result.allowed) {
            assert.equal(result.message, CLIENT_OAUTH_GUARD_MESSAGES.missingClient)
        }
        assert.equal(signOutCalls, 1)
    }

    {
        let signOutCalls = 0
        const result = await validateClientOAuthAccess(
            createDeps({
                lookupLinkedClients: async () => ({
                    data: [
                        { id: 'client-1', onboarding_status: 'invited' },
                        { id: 'client-2', onboarding_status: 'completed' },
                    ],
                    count: 2,
                    error: null,
                }),
                signOut: async () => {
                    signOutCalls += 1
                },
            })
        )

        assert.equal(result.allowed, false)
        if (!result.allowed) {
            assert.equal(result.message, CLIENT_OAUTH_GUARD_MESSAGES.duplicatedClient)
        }
        assert.equal(signOutCalls, 1)
    }

    {
        let signOutCalls = 0
        const result = await validateClientOAuthAccess(
            createDeps({
                lookupLinkedClients: async () => ({
                    data: [{ id: 'client-1', onboarding_status: 'completed' }],
                    count: 1,
                    error: null,
                }),
                signOut: async () => {
                    signOutCalls += 1
                },
            })
        )

        assert.equal(result.allowed, true)
        if (result.allowed) {
            assert.equal(result.onboardingStatus, 'completed')
        }
        assert.equal(signOutCalls, 0)
    }

    {
        let loggedContext = ''
        const result = await validateClientOAuthAccess(
            createDeps({
                linkClientByEmail: async () => ({
                    error: new Error('link warning'),
                }),
                logError: (context) => {
                    loggedContext = context
                },
            })
        )

        assert.equal(loggedContext, 'Account Linking Error')
        assert.equal(result.allowed, true)
    }

    console.log('OK: all client OAuth guard cases passed')
}

run().catch((error) => {
    console.error('FAIL: client OAuth guard tests failed')
    console.error(error)
    process.exit(1)
})
