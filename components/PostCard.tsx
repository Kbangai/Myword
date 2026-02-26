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
    const [shareCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [showComments, setShowComments] = useState(false)

    const isOwnPost = user?.id === post.user_id

    const handleLike = async () => {
        if (!user || loading) return
        setLoading(true)
        const supabase = createClient()

        if (liked) {
            await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', post.id)
            setLiked(false)
            setLikeCount(prev => prev - 1)
        } else {
            await supabase.from('likes').insert({ user_id: user.id, post_id: post.id })
            setLiked(true)
            setLikeCount(prev => prev + 1)
        }

        setLoading(false)
        onLike?.()
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const formatDateShort = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        })
    }

    // Support both new and legacy field names
    const displayAffirmation = post.my_affirmation || post.my_confession || ''
    const displayTestimony = post.my_testimony || post.additional_notes || ''
    const displayTitle = post.preacher || post.session_title || ''
    const serviceLabel = post.service_type
        ? SERVICE_TYPE_LABELS[post.service_type as ServiceType] || post.service_type
        : null

    return (
        <>
            <style>{`
                .post-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 1.125rem 1.25rem 0.875rem;
                    transition: box-shadow 0.2s;
                }
                .post-card:hover {
                    box-shadow: var(--shadow-md);
                }
                .post-section-label {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    margin-bottom: 0.375rem;
                }
                .post-action-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-family: var(--font-primary);
                    font-size: 0.875rem;
                    color: var(--text-muted);
                    padding: 4px 6px;
                    border-radius: 6px;
                    transition: color 0.15s, background 0.15s;
                    text-decoration: none;
                }
                .post-action-btn:hover {
                    color: var(--text-secondary);
                    background: var(--bg-tertiary);
                }
                .post-action-btn.liked {
                    color: #ef4444;
                }
            `}</style>

            <div className="post-card">
                {/* ── Header ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.875rem',
                }}>
                    <Link
                        href={`/profile/${post.user_id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}
                    >
                        <UserAvatar
                            src={post.profiles?.avatar_url}
                            name={post.profiles?.display_name || 'User'}
                        />
                        <div>
                            <div style={{
                                fontWeight: 700,
                                fontSize: '0.9375rem',
                                color: 'var(--text-primary)',
                                lineHeight: 1.2,
                            }}>
                                {post.profiles?.display_name || 'Anonymous'}
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                fontSize: '0.8rem',
                                color: 'var(--text-muted)',
                                marginTop: '1px',
                            }}>
                                {serviceLabel && (
                                    <>
                                        {/* Church/service icon */}
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                            <polyline points="9 22 9 12 15 12 15 22" />
                                        </svg>
                                        <span>{serviceLabel}</span>
                                        <span>·</span>
                                    </>
                                )}
                                <span>{formatDate(post.created_at)}</span>
                                {!post.is_public && (
                                    <span style={{
                                        marginLeft: '4px',
                                        fontSize: '0.7rem',
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        padding: '1px 5px',
                                        color: 'var(--text-muted)',
                                    }}>
                                        🔒 Private
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>

                    {/* Own-post actions */}
                    {isOwnPost && (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <Link href={`/edit/${post.id}`} className="post-action-btn" title="Edit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </Link>
                            {onDelete && (
                                <button onClick={onDelete} className="post-action-btn" title="Delete" style={{ color: '#ef4444' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                        <path d="M10 11v6M14 11v6" />
                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Preacher ── */}
                {displayTitle && (
                    <div style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.75rem',
                        fontStyle: 'italic',
                    }}>
                        Preacher: <strong style={{ fontStyle: 'normal', color: 'var(--text-secondary)' }}>{displayTitle}</strong>
                    </div>
                )}

                {/* ── MY WORD ── */}
                <div style={{ marginBottom: '0.875rem' }}>
                    <div className="post-section-label" style={{ color: '#d97706' }}>
                        {/* spark icon */}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                        My Word
                    </div>
                    <p style={{
                        margin: 0,
                        fontSize: '1rem',
                        lineHeight: 1.65,
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                    }}>
                        {post.my_word}
                    </p>
                </div>

                {/* ── MY RESPONSE (blockquote style) ── */}
                {post.my_response && (
                    <div style={{
                        borderLeft: '3px solid #6366f1',
                        paddingLeft: '0.875rem',
                        marginBottom: '0.875rem',
                        background: 'rgba(99,102,241,0.04)',
                        borderRadius: '0 8px 8px 0',
                        padding: '0.625rem 0.75rem 0.625rem 0.875rem',
                    }}>
                        <div className="post-section-label" style={{ color: '#6366f1' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            My Response
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                            {post.my_response}
                        </p>
                    </div>
                )}

                {/* ── MY AFFIRMATION ── */}
                {displayAffirmation && (
                    <div style={{
                        borderLeft: '3px solid #7c3aed',
                        paddingLeft: '0.875rem',
                        marginBottom: '0.875rem',
                        background: 'rgba(124,58,237,0.04)',
                        borderRadius: '0 8px 8px 0',
                        padding: '0.625rem 0.75rem 0.625rem 0.875rem',
                    }}>
                        <div className="post-section-label" style={{ color: '#7c3aed' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                            </svg>
                            My Affirmation
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                            {displayAffirmation}
                        </p>
                    </div>
                )}

                {/* ── TESTIMONY (green block) ── */}
                {displayTestimony && (
                    <div style={{
                        background: 'rgba(5,150,105,0.07)',
                        border: '1px solid rgba(5,150,105,0.2)',
                        borderRadius: '10px',
                        padding: '0.75rem 0.875rem',
                        marginBottom: '0.875rem',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.375rem',
                        }}>
                            <div className="post-section-label" style={{ color: '#059669', marginBottom: 0 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                                </svg>
                                Testimony
                            </div>
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: 'rgba(5,150,105,0.15)',
                                color: '#059669',
                                borderRadius: '6px',
                                padding: '1px 7px',
                            }}>
                                {formatDateShort(post.updated_at || post.created_at)}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                            {displayTestimony}
                        </p>
                    </div>
                )}

                {/* ── Prayer Points ── */}
                {post.prayer_points && post.prayer_points.length > 0 && (
                    <div style={{
                        background: 'var(--bg-tertiary)',
                        borderRadius: '8px',
                        padding: '0.625rem 0.875rem',
                        marginBottom: '0.875rem',
                    }}>
                        <div className="post-section-label" style={{ color: 'var(--text-muted)' }}>
                            🙏 Prayer Points
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {post.prayer_points.map((pt, i) => (
                                <li key={i} style={{ marginBottom: '2px' }}>{pt}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Image attachment ── */}
                {post.image_url && (
                    <div style={{ marginBottom: '0.875rem' }}>
                        <img
                            src={post.image_url}
                            alt="Post attachment"
                            style={{
                                width: '100%',
                                maxHeight: '280px',
                                objectFit: 'cover',
                                borderRadius: '10px',
                            }}
                        />
                    </div>
                )}

                {/* ── Link attachment ── */}
                {post.link_url && (
                    <a
                        href={post.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '8px',
                            color: 'var(--primary-500)',
                            fontSize: '0.8125rem',
                            textDecoration: 'none',
                            marginBottom: '0.875rem',
                            overflow: 'hidden',
                        }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {post.link_url}
                        </span>
                    </a>
                )}

                {/* ── Footer actions ── */}
                <div style={{
                    borderTop: '1px solid var(--border-color)',
                    marginTop: '0.625rem',
                    paddingTop: '0.625rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                }}>
                    {/* Like */}
                    <button
                        onClick={handleLike}
                        className={`post-action-btn${liked ? ' liked' : ''}`}
                        disabled={loading}
                        title={liked ? 'Unlike' : 'Like'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{likeCount}</span>
                    </button>

                    {/* Share */}
                    <button
                        className="post-action-btn"
                        title="Share"
                        onClick={() => navigator.share?.({ url: window.location.href }).catch(() => { })}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        <span>{shareCount}</span>
                    </button>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Comments stub */}
                    <button
                        className="post-action-btn"
                        onClick={() => setShowComments(v => !v)}
                        title="Comments"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>0 Comments</span>
                    </button>
                </div>
            </div>
        </>
    )
}
