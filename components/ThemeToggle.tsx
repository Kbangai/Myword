'use client'

import { useTheme } from '@/hooks/useTheme'

export default function ThemeToggle() {
    const { theme, toggleTheme, mounted } = useTheme()

    if (!mounted) {
        return <div className="theme-toggle-skeleton" style={{ width: '120px', height: '40px' }} />
    }

    return (
        <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            aria-label="Toggle theme"
        >
            {theme === 'youth' ? (
                <>
                    <span>🌟</span>
                    <span>Youth</span>
                </>
            ) : (
                <>
                    <span>✨</span>
                    <span>Adult</span>
                </>
            )}
        </button>
    )
}
