'use client'

import { useEffect, useState } from 'react'

export type Theme = 'youth' | 'adult'

export function useTheme() {
    const [theme, setTheme] = useState<Theme>('youth')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('my-word-theme') as Theme
        if (savedTheme) {
            setTheme(savedTheme)
            document.documentElement.setAttribute('data-theme', savedTheme)
        } else {
            document.documentElement.setAttribute('data-theme', 'youth')
        }
    }, [])

    const toggleTheme = () => {
        const newTheme: Theme = theme === 'youth' ? 'adult' : 'youth'
        setTheme(newTheme)
        localStorage.setItem('my-word-theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }

    const setThemeMode = (newTheme: Theme) => {
        setTheme(newTheme)
        localStorage.setItem('my-word-theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }

    return {
        theme,
        toggleTheme,
        setThemeMode,
        mounted,
    }
}
