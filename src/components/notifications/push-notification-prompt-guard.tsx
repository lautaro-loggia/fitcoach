'use client'

import React from 'react'
import { PushNotificationPrompt } from '@/components/notifications/push-notification-prompt'

type PushPromptBoundaryState = {
    hasError: boolean
}

class PushPromptErrorBoundary extends React.Component<React.PropsWithChildren, PushPromptBoundaryState> {
    state: PushPromptBoundaryState = { hasError: false }

    static getDerivedStateFromError(): PushPromptBoundaryState {
        return { hasError: true }
    }

    componentDidCatch(error: unknown) {
        console.error('PushNotificationPrompt crashed:', error)
    }

    render() {
        if (this.state.hasError) {
            return null
        }

        return this.props.children
    }
}

export function PushNotificationPromptGuard() {
    return (
        <PushPromptErrorBoundary>
            <PushNotificationPrompt />
        </PushPromptErrorBoundary>
    )
}
