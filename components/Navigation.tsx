'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ThemeToggle from './ThemeToggle'
import UserAvatar from './UserAvatar'
import NotificationBell from './NotificationBell'
import { useState } from 'react'

export default function Navigation() {
    const pathname = usePathname()
    const router = useRouter()
    const { user, isAuthenticated, signOut } = useAuth()
    const [showUserMenu, setShowUserMenu] = useState(false)

    if (!isAuthenticated) return null

    const iconLinks = [
        {
            href: `/profile/${user?.id}`,
            title: 'Profile',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            ),
        },
        {
            href: '/my-journal',
            title: 'My Journal',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            ),
        },
    ]

    return (
        <>
            <style>{`
                .nav-icon-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    border: 1.5px solid var(--border-color);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    cursor: pointer;
                    text-decoration: none;
                    transition: all 0.18s;
                    flex-shrink: 0;
                }
                .nav-icon-btn:hover {
                    border-color: var(--border-hover);
                    color: var(--text-primary);
                    background: var(--bg-card-hover);
                }
                .nav-icon-btn.active {
                    border-color: var(--primary-500);
                    color: var(--primary-500);
                }
            `}</style>
            <nav style={{
                position: 'sticky',
                top: 0,
                zIndex: 'var(--z-sticky)',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                backdropFilter: 'blur(12px)',
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '0.625rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                }}>
                    {/* Logo */}
                    <Link href="/feed" style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.15)" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div style={{ lineHeight: 1.1 }}>
                                <div style={{
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    color: 'var(--text-primary)',
                                }}>
                                    MyWord
                                </div>
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 400,
                                }}>
                                    Capture · Respond · Testify
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Right side: icon buttons + Post CTA */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        flexWrap: 'nowrap',
                    }}>
                        {/* Profile icon */}
                        {iconLinks.map((il) => (
                            <Link
                                key={il.href}
                                href={il.href}
                                title={il.title}
                                className={`nav-icon-btn${pathname === il.href ? ' active' : ''}`}
                            >
                                {il.icon}
                            </Link>
                        ))}

                        {/* Notification bell */}
                        <div className="nav-icon-btn" style={{ padding: 0 }}>
                            <NotificationBell />
                        </div>

                        {/* Theme toggle */}
                        <div className="nav-icon-btn" style={{ padding: 0, overflow: 'hidden' }}>
                            <ThemeToggle />
                        </div>

                        {/* People */}
                        <Link
                            href="/people"
                            title="People"
                            className={`nav-icon-btn${pathname === '/people' ? ' active' : ''}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </Link>

                        {/* Summaries / Calendar */}
                        <Link
                            href="/summaries"
                            title="Summaries"
                            className={`nav-icon-btn${pathname === '/summaries' ? ' active' : ''}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </Link>

                        {/* + Post CTA */}
                        <Link
                            href="/create"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '0.5rem 1rem',
                                background: 'var(--gradient-primary)',
                                color: 'white',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                boxShadow: 'var(--shadow-md)',
                                transition: 'opacity 0.18s, transform 0.18s',
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Post
                        </Link>

                        {/* User avatar menu */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                }}
                            >
                                <UserAvatar
                                    src={user?.user_metadata?.avatar_url}
                                    name={user?.user_metadata?.display_name || user?.email}
                                />
                            </button>

                            {showUserMenu && (
                                <div
                                    className="animate-slide-down"
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 'calc(100% + 8px)',
                                        minWidth: '190px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: 'var(--space-sm)',
                                        boxShadow: 'var(--shadow-lg)',
                                        zIndex: 'var(--z-dropdown)',
                                    }}
                                >
                                    <Link
                                        href={`/profile/${user?.id}`}
                                        className="btn btn-ghost"
                                        style={{ width: '100%', justifyContent: 'flex-start' }}
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        <span>👤</span><span>Profile</span>
                                    </Link>
                                    <Link
                                        href="/my-journal"
                                        className="btn btn-ghost"
                                        style={{ width: '100%', justifyContent: 'flex-start' }}
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        <span>📖</span><span>My Journal</span>
                                    </Link>
                                    <div className="divider" style={{ margin: '4px 0' }} />
                                    <button
                                        onClick={() => { signOut(); setShowUserMenu(false) }}
                                        className="btn btn-ghost"
                                        style={{ width: '100%', justifyContent: 'flex-start', color: '#ef4444' }}
                                    >
                                        <span>🚪</span><span>Sign Out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </>
    )
}
