'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/UserAvatar'
import PostCard from '@/components/PostCard'
import { Post, Profile } from '@/lib/types'

type ProfileTab = 'reflections' | 'testimonies'

export default function ProfilePage() {
    const params = useParams()
    const router = useRouter()
    const { user, isAuthenticated, loading: authLoading, signOut } = useAuth()
    const userId = params.userId as string

    const [profile, setProfile] = useState<Profile | null>(null)
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [isFollowing, setIsFollowing] = useState(false)
    const [followerCount, setFollowerCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [activeTab, setActiveTab] = useState<ProfileTab>('reflections')

    const isOwnProfile = user?.id === userId

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push('/auth/login')
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (!authLoading && isAuthenticated) loadProfile()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated, userId])

    const loadProfile = async () => {
        setLoading(true)
        const supabase = createClient()

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
        if (profileData) setProfile(profileData)

        let query = supabase
            .from('posts')
            .select(`*, profiles:user_id (id, display_name, avatar_url)`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        if (!isOwnProfile) query = query.eq('is_public', true)

        const { data: postsData } = await query
        if (postsData) setPosts(postsData as Post[])

        if (!isOwnProfile && user) {
            const { data: followData } = await supabase
                .from('follows').select('id')
                .eq('follower_id', user.id).eq('following_id', userId).single()
            setIsFollowing(!!followData)
        }

        const { count: followers } = await supabase
            .from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId)
        const { count: following } = await supabase
            .from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
        setFollowerCount(followers || 0)
        setFollowingCount(following || 0)
        setLoading(false)
    }

    const handleFollow = async () => {
        if (!user) return
        const supabase = createClient()
        if (isFollowing) {
            await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId)
            setIsFollowing(false)
            setFollowerCount(p => p - 1)
        } else {
            await supabase.from('follows').insert({ follower_id: user.id, following_id: userId })
            setIsFollowing(true)
            setFollowerCount(p => p + 1)
        }
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/auth/login')
    }

    if (authLoading || !isAuthenticated || loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '48px', height: '48px' }} />
            </div>
        )
    }

    if (!profile) {
        return (
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.25rem' }}>
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h2>Profile not found</h2>
                </div>
            </div>
        )
    }

    // Split posts into reflections (all) vs testimonies (have testimony)
    const testimonies = posts.filter(p => p.my_testimony || p.additional_notes)
    const reflections = posts

    const userEmail = isOwnProfile ? (user?.email || '') : ''

    return (
        <>
            <style>{`
                .profile-banner {
                    height: 130px;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
                    position: relative;
                }
                .profile-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 1.25rem 1.5rem 1.25rem;
                    margin: -48px 0 1.5rem;
                    position: relative;
                    box-shadow: var(--shadow-lg);
                }
                .profile-stat {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }
                .profile-stat-num {
                    font-size: 1.375rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    line-height: 1;
                }
                .profile-stat-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }
                .profile-action-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 7px 16px;
                    border-radius: 8px;
                    font-family: var(--font-primary);
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                    border: 1.5px solid var(--border-color);
                    background: transparent;
                    color: var(--text-secondary);
                    text-decoration: none;
                }
                .profile-action-btn:hover {
                    border-color: var(--primary-500);
                    color: var(--primary-500);
                }
                .profile-action-btn.danger {
                    color: #ef4444;
                    border-color: #fca5a5;
                }
                .profile-action-btn.danger:hover {
                    background: rgba(239,68,68,0.06);
                    border-color: #ef4444;
                }
                .profile-tab {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 20px;
                    flex: 1;
                    justify-content: center;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    font-family: var(--font-primary);
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .profile-tab.active {
                    background: transparent;
                    border-color: var(--primary-500);
                    color: var(--primary-500);
                    font-weight: 700;
                }
                .profile-tab:hover:not(.active) {
                    color: var(--text-secondary);
                }
                .profile-avatar-ring {
                    border: 4px solid var(--bg-card);
                    border-radius: 50%;
                    display: inline-block;
                    margin-top: -28px;
                    position: relative;
                    z-index: 1;
                }
            `}</style>

            <div style={{ maxWidth: '720px', margin: '0 auto' }}>

                {/* ── Gradient Banner ── */}
                <div className="profile-banner" />

                {/* ── Padded content ── */}
                <div style={{ padding: '0 1.25rem 2rem' }}>

                    {/* ── Profile Card ── */}
                    <div className="profile-card">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>

                            {/* Avatar (overlaps banner) */}
                            <div className="profile-avatar-ring">
                                <UserAvatar
                                    src={profile.avatar_url}
                                    name={profile.display_name || 'User'}
                                    size="xl"
                                />
                            </div>

                            {/* Info + Stats */}
                            <div style={{ flex: 1, minWidth: '180px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <h2 style={{ margin: '0 0 2px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            {profile.display_name || 'Anonymous'}
                                        </h2>
                                        {userEmail && (
                                            <p style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                {userEmail}
                                            </p>
                                        )}
                                        {profile.bio && !userEmail && (
                                            <p style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                {profile.bio}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                        {isOwnProfile ? (
                                            <>
                                                <button
                                                    onClick={() => router.push('/settings')}
                                                    className="profile-action-btn"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="3" />
                                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                                    </svg>
                                                    Edit
                                                </button>
                                                <button onClick={handleSignOut} className="profile-action-btn danger">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                                        <polyline points="16 17 21 12 16 7" />
                                                        <line x1="21" y1="12" x2="9" y2="12" />
                                                    </svg>
                                                    Logout
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={handleFollow}
                                                className="profile-action-btn"
                                                style={isFollowing ? { borderColor: 'var(--primary-500)', color: 'var(--primary-500)' } : {}}
                                            >
                                                {isFollowing ? '✓ Following' : '+ Follow'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Stats row */}
                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    <div className="profile-stat">
                                        <span className="profile-stat-num">{reflections.length}</span>
                                        <span className="profile-stat-label">Reflections</span>
                                    </div>
                                    <div className="profile-stat">
                                        <span className="profile-stat-num">{followerCount}</span>
                                        <span className="profile-stat-label">Followers</span>
                                    </div>
                                    <div className="profile-stat">
                                        <span className="profile-stat-num">{followingCount}</span>
                                        <span className="profile-stat-label">Following</span>
                                    </div>
                                    <div className="profile-stat">
                                        <span className="profile-stat-num">{testimonies.length}</span>
                                        <span className="profile-stat-label">Testimonies</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Tab bar ── */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <button
                            className={`profile-tab${activeTab === 'reflections' ? ' active' : ''}`}
                            onClick={() => setActiveTab('reflections')}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                            Reflections ({reflections.length})
                        </button>
                        <button
                            className={`profile-tab${activeTab === 'testimonies' ? ' active' : ''}`}
                            onClick={() => setActiveTab('testimonies')}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            Testimonies ({testimonies.length})
                        </button>
                    </div>

                    {/* ── Posts ── */}
                    {activeTab === 'reflections' && (
                        reflections.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
                                <p style={{ color: 'var(--text-muted)' }}>
                                    {isOwnProfile ? "You haven't created any reflections yet." : 'No public reflections yet.'}
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {reflections.map(post => <PostCard key={post.id} post={post} />)}
                            </div>
                        )
                    )}

                    {activeTab === 'testimonies' && (
                        testimonies.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌟</div>
                                <p style={{ color: 'var(--text-muted)' }}>
                                    {isOwnProfile ? "No testimonies yet — add one when you edit a post." : 'No testimonies shared yet.'}
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {testimonies.map(post => <PostCard key={post.id} post={post} />)}
                            </div>
                        )
                    )}
                </div>
            </div>
        </>
    )
}
