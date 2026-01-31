'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import React from 'react'

interface Tab {
    id: string
    label: string
    href?: string
    onClick?: () => void
}

interface DashboardTopBarProps {
    title: string
    subtitle?: string
    tabs?: Tab[]
    activeTab?: string
    children?: React.ReactNode // For buttons/actions
}

export function DashboardTopBar({ title, subtitle, tabs = [], activeTab, children }: DashboardTopBarProps) {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 h-16 md:h-[72px] shrink-0">
            <div className="flex h-full items-center px-4 md:px-6 gap-4">
                <div className="flex flex-col min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 truncate">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-[10px] md:text-xs text-muted-foreground truncate hidden md:block">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-4">
                    {tabs.length > 0 && (
                        <nav className="flex items-center gap-0.5 md:gap-1 overflow-x-auto no-scrollbar scroll-smooth py-1">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id

                                if (tab.href) {
                                    return (
                                        <Link
                                            key={tab.id}
                                            href={tab.href}
                                            className={cn(
                                                "px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold rounded-full transition-all whitespace-nowrap",
                                                isActive
                                                    ? "bg-gray-900 text-white"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            {tab.label}
                                        </Link>
                                    )
                                }

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={tab.onClick}
                                        className={cn(
                                            "px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold rounded-full transition-all whitespace-nowrap",
                                            isActive
                                                ? "bg-gray-900 text-white"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </nav>
                    )}

                    {children && (
                        <div className="flex items-center gap-2 shrink-0">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
