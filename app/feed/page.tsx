'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import PostCard from '@/components/PostCard'
import { Post } from '@/lib/types'
import Link from 'next/link'

type FeedTab = 'feed' | 'reflections' | 'testimonies'

export default function FeedPage() {
    const router = useRouter()
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<FeedTab>('feed')
    const [filter, setFilter] = useState<'all' | 'following'>('all')

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/auth/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (isAuthenticated) {
            loadPosts()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, filter, activeTab])

    const loadPosts = async () => {
        setLoading(true)
        const supabase = createClient()

        let query = supabase
            .from('posts')
            .select(`
                *,
                profiles:user_id (
                    id,
                    display_name,
                    avatar_url
                )
            `)
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(50)

        // Filter by tab: Testimonies tab shows posts that have a testimony
        if (activeTab === 'testimonies') {
            query = query.not('my_testimony', 'is', null)
        }

        // Following filter
        if (filter === 'following') {
            const { data: follows } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', user?.id)

            const followingIds = follows?.map((f: { following_id: string }) => f.following_id) || []

            if (followingIds.length === 0) {
                setPosts([])
                setLoading(false)
                return
            }

            query = query.in('user_id', followingIds)
        }

        const { data, error } = await query

        if (!error && data) {
            setPosts(data as Post[])
        }

        setLoading(false)
    }

    if (authLoading || !isAuthenticated) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div className="spinner" style={{ width: '48px', height: '48px' }} />
            </div>
        )
    }

    const tabs: { key: FeedTab; label: string; icon: React.ReactNode }[] = [
        {
            key: 'feed',
            label: 'Feed',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
            ),
        },
        {
            key: 'reflections',
            label: 'My Reflections',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            ),
        },
        {
            key: 'testimonies',
            label: 'Testimonies',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            ),
        },
    ]

    const emptyMessages: Record<FeedTab, { title: string; body: string }> = {
        feed: {
            title: 'No posts yet',
            body: filter === 'following'
                ? "You're not following anyone yet. Check the All tab to find people to follow!"
                : 'Be the first to share your spiritual journey!',
        },
        reflections: {
            title: 'No reflections yet',
            body: 'Your reflections (posts with My Word, My Response, or My Affirmation) will appear here.',
        },
        testimonies: {
            title: 'No testimonies yet',
            body: 'Posts that include a testimony section will appear here.',
        },
    }

    return (
        <>
            <style>{`
                .feed-tab-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 18px;
                    background: transparent;
                    border: none;
                    border-bottom: 2.5px solid transparent;
                    cursor: pointer;
                    font-family: var(--font-primary);
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--text-muted);
                    transition: color 0.18s, border-color 0.18s;
                    white-space: nowrap;
                }
                .feed-tab-btn.active {
                    color: var(--primary-500);
                    border-bottom-color: var(--primary-500);
                    font-weight: 700;
                }
                .feed-tab-btn:hover:not(.active) {
                    color: var(--text-secondary);
                }
                .feed-filter-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 5px 14px;
                    border-radius: 20px;
                    border: 1.5px solid var(--border-color);
                    background: transparent;
                    font-family: var(--font-primary);
                    font-size: 0.8125rem;
                    font-weight: 500;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all 0.18s;
                }
                .feed-filter-pill.active {
                    background: var(--primary-500);
                    border-color: var(--primary-500);
                    color: white;
                    font-weight: 600;
                }
                .feed-filter-pill:hover:not(.active) {
                    border-color: var(--primary-500);
                    color: var(--primary-500);
                }
            `}</style>

            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 var(--space-lg)' }}>

                {/* Tab bar */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '1.5rem',
                    gap: '0.25rem',
                    overflowX: 'auto',
                }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`feed-tab-btn${activeTab === tab.key ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filter pills (only on main feed tab) */}
                {activeTab === 'feed' && (
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '1.25rem',
                        flexWrap: 'wrap',
                    }}>
                        <button
                            className={`feed-filter-pill${filter === 'all' ? ' active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            🌐 All
                        </button>
                        <button
                            className={`feed-filter-pill${filter === 'following' ? ' active' : ''}`}
                            onClick={() => setFilter('following')}
                        >
                            👥 Following
                        </button>
                    </div>
                )}

                {/* Posts list */}
                {loading ? (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: 'var(--space-3xl)',
                    }}>
                        <div className="spinner" style={{ width: '48px', height: '48px' }} />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-md)' }}>
                            {activeTab === 'testimonies' ? '🌟' : '📭'}
                        </div>
                        <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '1.125rem' }}>
                            {emptyMessages[activeTab].title}
                        </h3>
                        <p style={{
                            color: 'var(--text-secondary)',
                            marginBottom: 'var(--space-xl)',
                            fontSize: '0.9rem',
                        }}>
                            {emptyMessages[activeTab].body}
                        </p>
                        {activeTab === 'feed' && filter === 'all' && (
                            <Link href="/create" className="btn btn-primary">
                                <span>✍️</span>
                                <span>Create Your First Entry</span>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-lg)',
                    }}>
                        {posts.map((post) => (
                            <PostCard key={post.id} post={post} onLike={loadPosts} />
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
