'use client'

import Link from 'next/link'
import UserAvatar from './UserAvatar'
import { Post, SERVICE_TYPE_LABELS, ServiceType } from '@/lib/types'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface PostCardProps {
    post: Post
    onLike?: () => void
    onDelete?: () => void
}

export default function PostCard({ post, onLike, onDelete }: PostCardProps) {
    const { user } = useAuth()
    const [liked, setLiked] = useState(false)
    const [likeCount, setLikeCount] = useState(0)
    const [loading, setLoading] = useState(false)

    const isOwnPost = user?.id === post.user_id

    const handleLike = async () => {
        if (!user || loading) return

        setLoading(true)
        const supabase = createClient()

        if (liked) {
            // Unlike
            await supabase
                .from('likes')
                .delete()
                .eq('user_id', user.id)
                .eq('post_id', post.id)

            setLiked(false)
            setLikeCount(prev => prev - 1)
        } else {
            // Like
            await supabase
                .from('likes')
                .insert({ user_id: user.id, post_id: post.id })

            setLiked(true)
            setLikeCount(prev => prev + 1)
        }

        setLoading(false)
        onLike?.()
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString()
    }

    // Get display values - support both new and legacy field names
    const displayAffirmation = post.my_affirmation || post.my_confession || ''
    const displayTestimony = post.my_testimony || post.additional_notes || ''
    const displayTitle = post.preacher || post.session_title || ''

    return (
        <div className="card card-hover animate-slide-up">
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-lg)',
            }}>
                <Link
                    href={`/profile/${post.user_id}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        textDecoration: 'none',
                    }}
                >
                    <UserAvatar
                        src={post.profiles?.avatar_url}
                        name={post.profiles?.display_name || 'User'}
                    />
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {post.profiles?.display_name || 'Anonymous'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {formatDate(post.created_at)}
                        </div>
                    </div>
                </Link>

                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                    {post.service_type && (
                        <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                            {SERVICE_TYPE_LABELS[post.service_type as ServiceType] || post.service_type}
                        </span>
                    )}
                    {!post.is_public && (
                        <span className="badge badge-secondary">
                            🔒 Private
                        </span>
                    )}
                </div>
            </div>

            {/* Preacher/Title */}
            {displayTitle && (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Preacher:
                    </span>
                    <span style={{ fontWeight: 600, marginLeft: 'var(--space-xs)' }}>
                        {displayTitle}
                    </span>
                </div>
            )}

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div>
                    <div className="label" style={{ marginBottom: 'var(--space-sm)' }}>
                        My Word
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
                        {post.my_word}
                    </p>
                </div>

                <div>
                    <div className="label" style={{ marginBottom: 'var(--space-sm)' }}>
                        My Response
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
                        {post.my_response}
                    </p>
                </div>

                <div>
                    <div className="label" style={{ marginBottom: 'var(--space-sm)' }}>
                        My Affirmation
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
                        {displayAffirmation}
                    </p>
                </div>

                {displayTestimony && (
                    <div>
                        <div className="label" style={{ marginBottom: 'var(--space-sm)' }}>
                            My Testimony
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
                            {displayTestimony}
                        </p>
                    </div>
                )}

                {/* Prayer Points */}
                {post.prayer_points && post.prayer_points.length > 0 && (
                    <div>
                        <div className="label" style={{ marginBottom: 'var(--space-sm)' }}>
                            🙏 Prayer Points
                        </div>
                        <ul style={{
                            margin: 0,
                            paddingLeft: 'var(--space-lg)',
                            color: 'var(--text-secondary)',
                        }}>
                            {post.prayer_points.map((point, index) => (
                                <li key={index} style={{ marginBottom: 'var(--space-xs)' }}>
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Media Attachments */}
            {(post.image_url || post.link_url || post.audio_url) && (
                <div style={{
                    marginTop: 'var(--space-lg)',
                    padding: 'var(--space-md)',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                }}>
                    {/* Image */}
                    {post.image_url && (
                        <div style={{ marginBottom: post.link_url || post.audio_url ? 'var(--space-md)' : 0 }}>
                            <img
                                src={post.image_url}
                                alt="Post attachment"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '300px',
                                    borderRadius: 'var(--radius-md)',
                                    objectFit: 'cover',
                                }}
                            />
                        </div>
                    )}

                    {/* Link */}
                    {post.link_url && (
                        <div style={{ marginBottom: post.audio_url ? 'var(--space-md)' : 0 }}>
                            <a
                                href={post.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-sm)',
                                    color: 'var(--primary-500)',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                }}
                            >
                                <span>🔗</span>
                                <span style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {post.link_url}
                                </span>
                            </a>
                        </div>
                    )}

                    {/* Audio */}
                    {post.audio_url && (
                        <div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                marginBottom: 'var(--space-sm)',
                            }}>
                                <span>🎤</span>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    Voice Note
                                </span>
                            </div>
                            <audio
                                src={post.audio_url}
                                controls
                                style={{ width: '100%', maxWidth: '300px' }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="divider" />
            <div style={{
                display: 'flex',
                gap: 'var(--space-md)',
                alignItems: 'center',
            }}>
                <button
                    onClick={handleLike}
                    className={liked ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    disabled={loading}
                >
                    <span>{liked ? '❤️' : '🤍'}</span>
                    <span>{likeCount > 0 ? likeCount : 'Like'}</span>
                </button>

                {isOwnPost && (
                    <>
                        <Link href={`/edit/${post.id}`} className="btn btn-ghost btn-sm">
                            <span>✏️</span>
                            <span>Edit</span>
                        </Link>
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#ef4444' }}
                            >
                                <span>🗑️</span>
                                <span>Delete</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
