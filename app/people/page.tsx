'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/UserAvatar'
import { Profile, FriendRequest, Friend } from '@/lib/types'
import Link from 'next/link'

type TabType = 'search' | 'requests' | 'friends'

export default function PeoplePage() {
    const router = useRouter()
    const { user, isAuthenticated, loading: authLoading } = useAuth()

    const [activeTab, setActiveTab] = useState<TabType>('search')
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Profile[]>([])
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
    const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
    const [friends, setFriends] = useState<Friend[]>([])
    const [following, setFollowing] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/auth/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (isAuthenticated && user) {
            loadFollowing()
            loadFriendRequests()
            loadFriends()
        }
    }, [isAuthenticated, user])

    const loadFollowing = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user?.id)

        if (data) {
            setFollowing(data.map((f: { following_id: string }) => f.following_id))
        }
    }

    const loadFriendRequests = async () => {
        const supabase = createClient()

        // Incoming requests
        const { data: incoming } = await supabase
            .from('friend_requests')
            .select(`
                *,
                from_user:from_user_id (id, display_name, avatar_url)
            `)
            .eq('to_user_id', user?.id)
            .eq('status', 'pending')

        if (incoming) setFriendRequests(incoming as FriendRequest[])

        // Sent requests
        const { data: sent } = await supabase
            .from('friend_requests')
            .select(`
                *,
                to_user:to_user_id (id, display_name, avatar_url)
            `)
            .eq('from_user_id', user?.id)
            .eq('status', 'pending')

        if (sent) setSentRequests(sent as FriendRequest[])
    }

    const loadFriends = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('friends')
            .select(`
                *,
                friend:friend_id (id, display_name, avatar_url)
            `)
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

        if (!error && data) {
            setSearchResults(data as Profile[])
        }
        setLoading(false)
    }

    const handleFollow = async (userId: string) => {
        const supabase = createClient()

        if (following.includes(userId)) {
            await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user?.id)
                .eq('following_id', userId)

            setFollowing(prev => prev.filter(id => id !== userId))
        } else {
            await supabase
                .from('follows')
                .insert({ follower_id: user?.id, following_id: userId })

            setFollowing(prev => [...prev, userId])
        }
    }

    const sendFriendRequest = async (userId: string) => {
        const supabase = createClient()

        const { error } = await supabase
            .from('friend_requests')
            .insert({
                from_user_id: user?.id,
                to_user_id: userId,
            })

        if (!error) {
            loadFriendRequests()
        }
    }

    const respondToRequest = async (requestId: string, accept: boolean) => {
        const supabase = createClient()

        await supabase
            .from('friend_requests')
            .update({ status: accept ? 'accepted' : 'rejected' })
            .eq('id', requestId)

        loadFriendRequests()
        if (accept) loadFriends()
    }

    const removeFriend = async (friendId: string) => {
        if (!confirm('Are you sure you want to remove this friend?')) return

        const supabase = createClient()

        // Remove both directions of the friendship
        await supabase
            .from('friends')
            .delete()
            .or(`and(user_id.eq.${user?.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user?.id})`)

        loadFriends()
    }

    const isFriend = (userId: string) => {
        return friends.some(f => f.friend_id === userId)
    }

    const hasSentRequest = (userId: string) => {
        return sentRequests.some(r => r.to_user_id === userId)
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
            <h1 style={{ marginBottom: 'var(--space-xl)' }}>
                <span className="gradient-text">People</span>
            </h1>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-xl)',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: 'var(--space-md)',
            }}>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-ghost'}`}
                >
                    🔍 Search
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ position: 'relative' }}
                >
                    👋 Requests
                    {friendRequests.length > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
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
                            {friendRequests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`btn ${activeTab === 'friends' ? 'btn-primary' : 'btn-ghost'}`}
                >
                    🤝 Friends ({friends.length})
                </button>
            </div>

            {/* Search Tab */}
            {activeTab === 'search' && (
                <div>
                    <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                                style={{ flex: 1 }}
                            />
                            <button
                                onClick={searchUsers}
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                            <div className="spinner" />
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🔍</div>
                            <p style={{ color: 'var(--text-muted)' }}>
                                Search for people to follow and add as friends
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {searchResults.map((profile) => (
                                <div key={profile.id} className="card" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-md)',
                                    padding: 'var(--space-md)',
                                }}>
                                    <Link href={`/profile/${profile.id}`}>
                                        <UserAvatar
                                            src={profile.avatar_url}
                                            name={profile.display_name || 'User'}
                                            size="lg"
                                        />
                                    </Link>
                                    <div style={{ flex: 1 }}>
                                        <Link
                                            href={`/profile/${profile.id}`}
                                            style={{
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            {profile.display_name || 'Anonymous'}
                                        </Link>
                                        {profile.bio && (
                                            <p style={{
                                                fontSize: '0.875rem',
                                                color: 'var(--text-muted)',
                                                margin: 0,
                                                marginTop: 'var(--space-xs)',
                                            }}>
                                                {profile.bio.substring(0, 100)}...
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        <button
                                            onClick={() => handleFollow(profile.id)}
                                            className={`btn btn-sm ${following.includes(profile.id) ? 'btn-secondary' : 'btn-primary'}`}
                                        >
                                            {following.includes(profile.id) ? 'Unfollow' : 'Follow'}
                                        </button>
                                        {!isFriend(profile.id) && !hasSentRequest(profile.id) && (
                                            <button
                                                onClick={() => sendFriendRequest(profile.id)}
                                                className="btn btn-ghost btn-sm"
                                            >
                                                Add Friend
                                            </button>
                                        )}
                                        {hasSentRequest(profile.id) && (
                                            <span className="badge badge-secondary">Request Sent</span>
                                        )}
                                        {isFriend(profile.id) && (
                                            <span className="badge badge-primary">Friend</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
                <div>
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Incoming Requests</h3>
                    {friendRequests.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No pending friend requests</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                            {friendRequests.map((request) => (
                                <div key={request.id} className="card" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-md)',
                                    padding: 'var(--space-md)',
                                }}>
                                    <UserAvatar
                                        src={request.from_user?.avatar_url}
                                        name={request.from_user?.display_name || 'User'}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <Link
                                            href={`/profile/${request.from_user_id}`}
                                            style={{
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            {request.from_user?.display_name || 'Anonymous'}
                                        </Link>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                                            wants to be your friend
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        <button
                                            onClick={() => respondToRequest(request.id, true)}
                                            className="btn btn-primary btn-sm"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => respondToRequest(request.id, false)}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Sent Requests</h3>
                    {sentRequests.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No pending sent requests</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {sentRequests.map((request) => (
                                <div key={request.id} className="card" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-md)',
                                    padding: 'var(--space-md)',
                                }}>
                                    <UserAvatar
                                        src={request.to_user?.avatar_url}
                                        name={request.to_user?.display_name || 'User'}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontWeight: 600 }}>
                                            {request.to_user?.display_name || 'Anonymous'}
                                        </span>
                                    </div>
                                    <span className="badge badge-secondary">Pending</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
                <div>
                    {friends.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🤝</div>
                            <h3>No friends yet</h3>
                            <p style={{ color: 'var(--text-muted)' }}>
                                Search for people and send friend requests
                            </p>
                            <button
                                onClick={() => setActiveTab('search')}
                                className="btn btn-primary"
                                style={{ marginTop: 'var(--space-md)' }}
                            >
                                Find People
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {friends.map((friendship) => (
                                <div key={friendship.id} className="card" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-md)',
                                    padding: 'var(--space-md)',
                                }}>
                                    <Link href={`/profile/${friendship.friend_id}`}>
                                        <UserAvatar
                                            src={friendship.friend?.avatar_url}
                                            name={friendship.friend?.display_name || 'User'}
                                            size="lg"
                                        />
                                    </Link>
                                    <div style={{ flex: 1 }}>
                                        <Link
                                            href={`/profile/${friendship.friend_id}`}
                                            style={{
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            {friendship.friend?.display_name || 'Anonymous'}
                                        </Link>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        <button
                                            onClick={() => handleFollow(friendship.friend_id)}
                                            className={`btn btn-sm ${following.includes(friendship.friend_id) ? 'btn-secondary' : 'btn-primary'}`}
                                        >
                                            {following.includes(friendship.friend_id) ? 'Unfollow' : 'Follow'}
                                        </button>
                                        <button
                                            onClick={() => removeFriend(friendship.friend_id)}
                                            className="btn btn-ghost btn-sm"
                                            style={{ color: '#ef4444' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
