'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import PostCard from '@/components/PostCard'
import { Post } from '@/lib/types'

export default function FeedPage() {
    const router = useRouter()
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
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
    }, [isAuthenticated, filter])

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

        if (filter === 'following') {
            // Get users that current user follows
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

    return (
        <div className="container" style={{ padding: 'var(--space-2xl) var(--space-lg)' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-xl)',
            }}>
                <h1>
                    <span className="gradient-text">Community Feed</span>
                </h1>

                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button
                        onClick={() => setFilter('all')}
                        className={filter === 'all' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                    >
                        All Posts
                    </button>
                    <button
                        onClick={() => setFilter('following')}
                        className={filter === 'following' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                    >
                        Following
                    </button>
                </div>
            </div>

            {/* Posts */}
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
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>
                        📭
                    </div>
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>
                        No posts yet
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
                        {filter === 'following'
                            ? "You're not following anyone yet. Explore the All Posts feed to find people to follow!"
                            : "Be the first to share your spiritual journey!"}
                    </p>
                    {filter === 'all' && (
                        <button
                            onClick={() => router.push('/create')}
                            className="btn btn-primary"
                        >
                            <span>✍️</span>
                            <span>Create Your First Entry</span>
                        </button>
                    )}
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xl)',
                }}>
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} onLike={loadPosts} />
                    ))}
                </div>
            )}
        </div>
    )
}
