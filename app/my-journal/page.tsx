'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import PostCard from '@/components/PostCard'
import { Post } from '@/lib/types'

export default function MyJournalPage() {
    const router = useRouter()
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/auth/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (isAuthenticated) {
            loadPosts()
        }
    }, [isAuthenticated])

    const loadPosts = async () => {
        setLoading(true)
        const supabase = createClient()

        const { data, error } = await supabase
            .from('posts')
            .select(`
        *,
        profiles:user_id (
          id,
          display_name,
          avatar_url
        )
      `)
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setPosts(data as Post[])
        }

        setLoading(false)
    }

    const handleDelete = async (postId: string) => {
        if (!confirm('Are you sure you want to delete this entry?')) return

        const supabase = createClient()
        await supabase.from('posts').delete().eq('id', postId)
        loadPosts()
    }

    const filteredPosts = posts.filter(post => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            post.session_title.toLowerCase().includes(query) ||
            post.my_word.toLowerCase().includes(query) ||
            post.my_response.toLowerCase().includes(query) ||
            post.my_confession.toLowerCase().includes(query)
        )
    })

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
                flexWrap: 'wrap',
                gap: 'var(--space-md)',
            }}>
                <h1>
                    <span className="gradient-text">My Journal</span>
                </h1>

                <button
                    onClick={() => router.push('/create')}
                    className="btn btn-primary"
                >
                    <span>✍️</span>
                    <span>New Entry</span>
                </button>
            </div>

            {/* Search */}
            <div className="form-group">
                <input
                    type="text"
                    className="input"
                    placeholder="🔍 Search your entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)',
            }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-500)' }}>
                        {posts.length}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Total Entries
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                        {posts.filter(p => p.is_public).length}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Public
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {posts.filter(p => !p.is_public).length}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Private
                    </div>
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
            ) : filteredPosts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>
                        {searchQuery ? '🔍' : '📔'}
                    </div>
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>
                        {searchQuery ? 'No matching entries' : 'Start your spiritual journal'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
                        {searchQuery
                            ? 'Try a different search term'
                            : 'Create your first entry to begin capturing your spiritual journey'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => router.push('/create')}
                            className="btn btn-primary"
                        >
                            <span>✍️</span>
                            <span>Create First Entry</span>
                        </button>
                    )}
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xl)',
                }}>
                    {filteredPosts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onDelete={() => handleDelete(post.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
