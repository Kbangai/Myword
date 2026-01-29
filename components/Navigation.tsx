'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ThemeToggle from './ThemeToggle'
import UserAvatar from './UserAvatar'
import NotificationBell from './NotificationBell'
import { useState } from 'react'

export default function Navigation() {
    const pathname = usePathname()
    const { user, isAuthenticated, signOut } = useAuth()
    const [showUserMenu, setShowUserMenu] = useState(false)

    if (!isAuthenticated) {
        return null
    }

    const navLinks = [
        { href: '/feed', label: 'Feed', icon: '🏠' },
        { href: '/create', label: 'Post', icon: '✍️' },
        { href: '/my-journal', label: 'My Journal', icon: '📖' },
        { href: '/people', label: 'People', icon: '👥' },
        { href: '/summaries', label: 'Summaries', icon: '📊' },
    ]

    return (
        <nav style={{
            position: 'sticky',
            top: 0,
            zIndex: 'var(--z-sticky)',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            backdropFilter: 'blur(10px)',
        }}>
            <div className="container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-md) var(--space-lg)',
            }}>
                {/* Logo */}
                <Link href="/feed" style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                }}>
                    <span className="gradient-text">My Word</span>
                </Link>

                {/* Nav Links */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-md)',
                    alignItems: 'center',
                }}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={pathname === link.href ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                        >
                            <span>{link.icon}</span>
                            <span>{link.label}</span>
                        </Link>
                    ))}

                    <ThemeToggle />

                    <NotificationBell />

                    {/* User Menu */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            <UserAvatar
                                src={user?.user_metadata?.avatar_url}
                                name={user?.user_metadata?.display_name || user?.email}
                            />
                        </button>

                        {showUserMenu && (
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + var(--space-sm))',
                                    minWidth: '200px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--space-sm)',
                                    boxShadow: 'var(--shadow-lg)',
                                    zIndex: 'var(--z-dropdown)',
                                }}
                                className="animate-slide-down"
                            >
                                <Link
                                    href={`/profile/${user?.id}`}
                                    className="btn btn-ghost"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'flex-start',
                                    }}
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <span>👤</span>
                                    <span>Profile</span>
                                </Link>
                                <Link
                                    href="/settings"
                                    className="btn btn-ghost"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'flex-start',
                                    }}
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <span>⚙️</span>
                                    <span>Settings</span>
                                </Link>
                                <div className="divider" style={{ margin: 'var(--space-sm) 0' }} />
                                <button
                                    onClick={() => {
                                        signOut()
                                        setShowUserMenu(false)
                                    }}
                                    className="btn btn-ghost"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'flex-start',
                                        color: '#ef4444',
                                    }}
                                >
                                    <span>🚪</span>
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
