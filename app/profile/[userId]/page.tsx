'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/UserAvatar'
import PostCard from '@/components/PostCard'
import { Post, Profile } from '@/lib/types'

export default function ProfilePage() {
    const params = useParams()
    const router = useRouter()
    const { user, isAuthenticated } = useAuth()
    const userId = params.userId as string

    const [profile, setProfile] = useState<Profile | null>(null)
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [isFollowing, setIsFollowing] = useState(false)
    const [followerCount, setFollowerCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)

    const isOwnProfile = user?.id === userId

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/auth/login')
            return
        }
        loadProfile()
    }, [userId, isAuthenticated])

    const loadProfile = async () => {
        setLoading(true)
        const supabase = createClient()

        // Load profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (profileData) {
            setProfile(profileData)
        }

        // Load public posts (or all posts if own profile)
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
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (!isOwnProfile) {
            query = query.eq('is_public', true)
        }

        const { data: postsData } = await query
        if (postsData) {
            setPosts(postsData as Post[])
        }

        // Check if following
        if (!isOwnProfile && user) {
            const { data: followData } = await supabase
                .from('follows')
                .select('id')
                .eq('follower_id', user.id)
                .eq('following_id', userId)
                .single()

            setIsFollowing(!!followData)
        }

        // Get follower/following counts
        const { count: followers } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId)

        const { count: following } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId)

        setFollowerCount(followers || 0)
        setFollowingCount(following || 0)
        setLoading(false)
    }

    const handleFollow = async () => {
        if (!user) return

        const supabase = createClient()

        if (isFollowing) {
            await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', userId)

            setIsFollowing(false)
            setFollowerCount(prev => prev - 1)
        } else {
            await supabase
                .from('follows')
                .insert({ follower_id: user.id, following_id: userId })

            setIsFollowing(true)
            setFollowerCount(prev => prev + 1)
        }
    }

    if (loading) {
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

    if (!profile) {
        return (
            <div className="container" style={{ padding: 'var(--space-2xl) var(--space-lg)' }}>
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                    <h2>Profile not found</h2>
                </div>
            </div>
        )
    }

    return (
        <div className="container" style={{ padding: 'var(--space-2xl) var(--space-lg)' }}>
            {/* Profile Header */}
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-xl)',
                    flexWrap: 'wrap',
                }}>
                    <UserAvatar
                        src={profile.avatar_url}
                        name={profile.display_name || 'User'}
                        size="xl"
                    />

                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <h1 style={{ marginBottom: 'var(--space-sm)' }}>
                            {profile.display_name || 'Anonymous'}
                        </h1>

                        {profile.bio && (
                            <p style={{
                                color: 'var(--text-secondary)',
                                marginBottom: 'var(--space-lg)',
                            }}>
                                {profile.bio}
                            </p>
                        )}

                        <div style={{
                            display: 'flex',
                            gap: 'var(--space-xl)',
                            marginBottom: 'var(--space-lg)',
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                                    {posts.length}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    Posts
                                </div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                                    {followerCount}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    Followers
                                </div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                                    {followingCount}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    Following
                                </div>
                            </div>
                        </div>

                        {!isOwnProfile && (
                            <button
                                onClick={handleFollow}
                                className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
                            >
                                <span>{isFollowing ? '✓' : '+'}</span>
                                <span>{isFollowing ? 'Following' : 'Follow'}</span>
                            </button>
                        )}

                        {isOwnProfile && (
                            <button
                                onClick={() => router.push('/settings')}
                                className="btn btn-secondary"
                            >
                                <span>⚙️</span>
                                <span>Edit Profile</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Posts */}
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>
                {isOwnProfile ? 'Your Posts' : 'Public Posts'}
            </h2>

            {posts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>
                        📭
                    </div>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {isOwnProfile ? "You haven't created any posts yet" : 'No public posts yet'}
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xl)',
                }}>
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            )}
        </div>
    )
}
