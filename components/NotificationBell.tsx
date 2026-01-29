'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Notification } from '@/lib/types'
import UserAvatar from './UserAvatar'

export default function NotificationBell() {
    const { user, isAuthenticated } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isAuthenticated && user) {
            loadNotifications()
            // Set up real-time subscription
            const supabase = createClient()
            const subscription = supabase
                .channel('notifications')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                }, () => {
                    loadNotifications()
                })
                .subscribe()

            return () => {
                subscription.unsubscribe()
            }
        }
    }, [isAuthenticated, user])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const loadNotifications = async () => {
        if (!user) return
        setLoading(true)

        const supabase = createClient()
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                *,
                actor:actor_id (
                    id,
                    display_name,
                    avatar_url
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (!error && data) {
            setNotifications(data as Notification[])
            setUnreadCount(data.filter((n: Notification) => !n.read).length)
        }

        setLoading(false)
    }

    const markAsRead = async (notificationId: string) => {
        const supabase = createClient()
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId)

        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const markAllAsRead = async () => {
        if (!user) return
        const supabase = createClient()
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false)

        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
    }

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'friend_request': return '👋'
            case 'friend_accepted': return '🤝'
            case 'follow': return '👤'
            case 'like': return '❤️'
            default: return '🔔'
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 60) return `${diffMins}m`
        if (diffHours < 24) return `${diffHours}h`
        if (diffDays < 7) return `${diffDays}d`
        return date.toLocaleDateString()
    }

    if (!isAuthenticated) return null

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn btn-ghost"
                style={{
                    position: 'relative',
                    padding: 'var(--space-sm)',
                    fontSize: '1.25rem',
                }}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    width: '340px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                }}>
                    {/* Header */}
                    <div style={{
                        padding: 'var(--space-md)',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <h4 style={{ margin: 0 }}>Notifications</h4>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: '0.75rem' }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    {loading ? (
                        <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                            <div className="spinner" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div style={{
                            padding: 'var(--space-xl)',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🔔</div>
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <div>
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                    style={{
                                        padding: 'var(--space-md)',
                                        borderBottom: '1px solid var(--border-color)',
                                        background: notification.read ? 'transparent' : 'rgba(var(--primary-rgb), 0.05)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        gap: 'var(--space-sm)',
                                        alignItems: 'flex-start',
                                        transition: 'background 0.2s',
                                    }}
                                >
                                    <div style={{ fontSize: '1.25rem' }}>
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            display: 'flex',
                                            gap: 'var(--space-xs)',
                                            alignItems: 'center',
                                            marginBottom: 'var(--space-xs)',
                                        }}>
                                            <UserAvatar
                                                src={notification.actor?.avatar_url}
                                                name={notification.actor?.display_name || 'User'}
                                                size="sm"
                                            />
                                            <Link
                                                href={`/profile/${notification.actor_id}`}
                                                style={{
                                                    fontWeight: 600,
                                                    color: 'var(--text-primary)',
                                                    textDecoration: 'none',
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {notification.actor?.display_name || 'Someone'}
                                            </Link>
                                        </div>
                                        <p style={{
                                            fontSize: '0.875rem',
                                            color: 'var(--text-secondary)',
                                            margin: 0,
                                        }}>
                                            {notification.message}
                                        </p>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)',
                                        }}>
                                            {formatTime(notification.created_at)}
                                        </span>
                                    </div>
                                    {!notification.read && (
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            background: 'var(--primary-500)',
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                        }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
