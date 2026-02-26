'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/UserAvatar'
import { Profile, FriendRequest, Friend } from '@/lib/types'
import Link from 'next/link'

type TabType = 'friends' | 'requests' | 'discover'

const MAX_FRIENDS = 1000

export default function PeoplePage() {
    const router = useRouter()
    const { user, isAuthenticated, loading: authLoading } = useAuth()

    const [activeTab, setActiveTab] = useState<TabType>('friends')
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Profile[]>([])
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
    const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
    const [friends, setFriends] = useState<Friend[]>([])
    const [following, setFollowing] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push('/auth/login')
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (isAuthenticated && user) {
            loadFollowing()
            loadFriendRequests()
            loadFriends()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user])

    // ── Data loaders ─────────────────────────────────────────
    const loadFollowing = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user?.id)
        if (data) setFollowing(data.map((f: { following_id: string }) => f.following_id))
    }

    const loadFriendRequests = async () => {
        const supabase = createClient()
        const { data: incoming } = await supabase
            .from('friend_requests')
            .select('*, from_user:from_user_id (id, display_name, avatar_url)')
            .eq('to_user_id', user?.id)
            .eq('status', 'pending')
        if (incoming) setFriendRequests(incoming as FriendRequest[])

        const { data: sent } = await supabase
            .from('friend_requests')
            .select('*, to_user:to_user_id (id, display_name, avatar_url)')
            .eq('from_user_id', user?.id)
            .eq('status', 'pending')
        if (sent) setSentRequests(sent as FriendRequest[])
    }

    const loadFriends = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('friends')
            .select('*, friend:friend_id (id, display_name, avatar_url)')
            .eq('user_id', user?.id)
        if (data) setFriends(data as Friend[])
    }

    const searchUsers = async () => {
        if (!searchQuery.trim()) return
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('display_name', `%${searchQuery}%`)
            .neq('id', user?.id)
            .limit(20)
        if (!error && data) setSearchResults(data as Profile[])
        setLoading(false)
    }

    const handleFollow = async (userId: string) => {
        const supabase = createClient()
        if (following.includes(userId)) {
            await supabase.from('follows').delete().eq('follower_id', user?.id).eq('following_id', userId)
            setFollowing(prev => prev.filter(id => id !== userId))
        } else {
            await supabase.from('follows').insert({ follower_id: user?.id, following_id: userId })
            setFollowing(prev => [...prev, userId])
        }
    }

    const sendFriendRequest = async (userId: string) => {
        const supabase = createClient()
        const { error } = await supabase.from('friend_requests').insert({ from_user_id: user?.id, to_user_id: userId })
        if (!error) loadFriendRequests()
    }

    const respondToRequest = async (requestId: string, accept: boolean) => {
        const supabase = createClient()
        await supabase.from('friend_requests').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', requestId)
        loadFriendRequests()
        if (accept) loadFriends()
    }

    const removeFriend = async (friendId: string) => {
        if (!confirm('Remove this friend?')) return
        const supabase = createClient()
        await supabase.from('friends').delete()
            .or(`and(user_id.eq.${user?.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user?.id})`)
        loadFriends()
    }

    const isFriend = (userId: string) => friends.some(f => f.friend_id === userId)
    const hasSentRequest = (userId: string) => sentRequests.some(r => r.to_user_id === userId)

    if (authLoading || !isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '48px', height: '48px' }} />
            </div>
        )
    }

    const tabs: { key: TabType; label: string; count?: number; icon: React.ReactNode }[] = [
        {
            key: 'friends',
            label: 'Friends',
            count: friends.length,
            icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
        },
        {
            key: 'requests',
            label: 'Requests',
            count: friendRequests.length || undefined,
            icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
            ),
        },
        {
            key: 'discover',
            label: 'Discover',
            icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            ),
        },
    ]

    return (
        <>
            <style>{`
                .people-tab {
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
                    transition: color 0.15s, border-color 0.15s;
                    white-space: nowrap;
                    position: relative;
                }
                .people-tab.active {
                    color: var(--primary-500);
                    border-bottom-color: var(--primary-500);
                    font-weight: 700;
                }
                .people-tab:hover:not(.active) { color: var(--text-secondary); }
                .people-card {
                    display: flex;
                    align-items: center;
                    gap: 0.875rem;
                    padding: 0.875rem 1rem;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    transition: box-shadow 0.18s;
                }
                .people-card:hover { box-shadow: var(--shadow-md); }
                .people-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 2rem;
                    text-align: center;
                }
                .people-empty-icon {
                    width: 68px;
                    height: 68px;
                    border-radius: 50%;
                    background: rgba(99,102,241,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1.25rem;
                    color: var(--primary-500);
                }
                .people-btn-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 5px 14px;
                    border-radius: 20px;
                    border: 1.5px solid var(--border-color);
                    background: transparent;
                    font-family: var(--font-primary);
                    font-size: 0.8125rem;
                    font-weight: 600;
                    cursor: pointer;
                    color: var(--text-secondary);
                    transition: all 0.15s;
                    text-decoration: none;
                }
                .people-btn-pill:hover { border-color: var(--primary-500); color: var(--primary-500); }
                .people-btn-pill.primary { background: var(--gradient-primary); color: white; border-color: transparent; }
                .people-btn-pill.danger:hover { border-color: #ef4444; color: #ef4444; }
                .people-badge-red {
                    position: absolute;
                    top: 4px; right: 4px;
                    min-width: 17px; height: 17px;
                    background: #ef4444;
                    color: white;
                    border-radius: 10px;
                    font-size: 0.65rem;
                    font-weight: 800;
                    display: flex; align-items: center; justify-content: center;
                    padding: 0 4px;
                }
                .people-search-input {
                    width: 100%;
                    padding: 0.75rem 1rem 0.75rem 2.75rem;
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                    border-radius: 10px;
                    font-family: var(--font-primary);
                    font-size: 0.9375rem;
                    color: var(--text-primary);
                    outline: none;
                    transition: border-color 0.18s;
                }
                .people-search-input:focus { border-color: var(--primary-500); }
            `}</style>

            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 var(--space-lg) var(--space-3xl)' }}>

                {/* ── Page Header ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1.5rem 0 1rem' }}>
                    <div style={{
                        width: '48px', height: '48px',
                        borderRadius: '13px',
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            Friends
                        </h1>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {friends.length} / {MAX_FRIENDS.toLocaleString()} friends
                        </p>
                    </div>
                </div>

                {/* ── Tab bar ── */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`people-tab${activeTab === tab.key ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span style={{
                                    marginLeft: '2px',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                }}>
                                    ({tab.count})
                                </span>
                            )}
                            {tab.key === 'requests' && friendRequests.length > 0 && (
                                <span className="people-badge-red">{friendRequests.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ════════════════════════════════
                    FRIENDS TAB
                ════════════════════════════════ */}
                {activeTab === 'friends' && (
                    <div>
                        {friends.length === 0 ? (
                            <div className="people-empty">
                                <div className="people-empty-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>No friends yet</h3>
                                <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Start connecting with people in the community
                                </p>
                                <button className="people-btn-pill primary" onClick={() => setActiveTab('discover')}>
                                    Discover People
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {friends.map(friendship => (
                                    <div key={friendship.id} className="people-card">
                                        <Link href={`/profile/${friendship.friend_id}`}>
                                            <UserAvatar src={friendship.friend?.avatar_url} name={friendship.friend?.display_name || 'User'} size="lg" />
                                        </Link>
                                        <div style={{ flex: 1 }}>
                                            <Link href={`/profile/${friendship.friend_id}`} style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
                                                {friendship.friend?.display_name || 'Anonymous'}
                                            </Link>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => handleFollow(friendship.friend_id)}
                                                className="people-btn-pill"
                                                style={following.includes(friendship.friend_id) ? { borderColor: 'var(--primary-500)', color: 'var(--primary-500)' } : {}}
                                            >
                                                {following.includes(friendship.friend_id) ? 'Unfollow' : 'Follow'}
                                            </button>
                                            <button onClick={() => removeFriend(friendship.friend_id)} className="people-btn-pill danger">
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ════════════════════════════════
                    REQUESTS TAB
                ════════════════════════════════ */}
                {activeTab === 'requests' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Incoming */}
                        <div>
                            <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
                                Incoming ({friendRequests.length})
                            </p>
                            {friendRequests.length === 0 ? (
                                <div className="people-empty" style={{ padding: '2rem' }}>
                                    <div className="people-empty-icon" style={{ width: '50px', height: '50px' }}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="8.5" cy="7" r="4" />
                                            <line x1="20" y1="8" x2="20" y2="14" />
                                            <line x1="23" y1="11" x2="17" y2="11" />
                                        </svg>
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending requests</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {friendRequests.map(request => (
                                        <div key={request.id} className="people-card">
                                            <UserAvatar src={request.from_user?.avatar_url} name={request.from_user?.display_name || 'User'} />
                                            <div style={{ flex: 1 }}>
                                                <Link href={`/profile/${request.from_user_id}`} style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
                                                    {request.from_user?.display_name || 'Anonymous'}
                                                </Link>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>wants to be your friend</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                                                <button onClick={() => respondToRequest(request.id, true)} className="people-btn-pill primary">Accept</button>
                                                <button onClick={() => respondToRequest(request.id, false)} className="people-btn-pill">Decline</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sent */}
                        <div>
                            <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
                                Sent ({sentRequests.length})
                            </p>
                            {sentRequests.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>No sent requests</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {sentRequests.map(request => (
                                        <div key={request.id} className="people-card">
                                            <UserAvatar src={request.to_user?.avatar_url} name={request.to_user?.display_name || 'User'} />
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                                                    {request.to_user?.display_name || 'Anonymous'}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                Pending
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════
                    DISCOVER TAB (was Search)
                ════════════════════════════════ */}
                {activeTab === 'discover' && (
                    <div>
                        {/* Search bar */}
                        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                            <svg
                                width="16" height="16"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                className="people-search-input"
                                placeholder="Search by name…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && searchUsers()}
                            />
                            {searchQuery && (
                                <button
                                    onClick={searchUsers}
                                    disabled={loading}
                                    style={{
                                        position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
                                        padding: '5px 14px', borderRadius: '8px',
                                        background: 'var(--gradient-primary)', color: 'white', border: 'none',
                                        fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
                                        fontFamily: 'var(--font-primary)',
                                    }}
                                >
                                    {loading ? '…' : 'Search'}
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <div className="spinner" />
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="people-empty">
                                <div className="people-empty-icon">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Find people</h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Search by name to discover and connect with others
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {searchResults.map(profile => (
                                    <div key={profile.id} className="people-card">
                                        <Link href={`/profile/${profile.id}`}>
                                            <UserAvatar src={profile.avatar_url} name={profile.display_name || 'User'} size="lg" />
                                        </Link>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Link href={`/profile/${profile.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
                                                {profile.display_name || 'Anonymous'}
                                            </Link>
                                            {profile.bio && (
                                                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {profile.bio}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', flexShrink: 0 }}>
                                            <button
                                                onClick={() => handleFollow(profile.id)}
                                                className="people-btn-pill"
                                                style={following.includes(profile.id) ? { borderColor: 'var(--primary-500)', color: 'var(--primary-500)' } : {}}
                                            >
                                                {following.includes(profile.id) ? 'Unfollow' : 'Follow'}
                                            </button>
                                            {!isFriend(profile.id) && !hasSentRequest(profile.id) && (
                                                <button onClick={() => sendFriendRequest(profile.id)} className="people-btn-pill primary">
                                                    + Add
                                                </button>
                                            )}
                                            {hasSentRequest(profile.id) && (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '3px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                    Sent
                                                </span>
                                            )}
                                            {isFriend(profile.id) && (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--primary-500)', padding: '3px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: '6px', fontWeight: 600 }}>
                                                    Friends ✓
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
