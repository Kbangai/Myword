'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/UserAvatar'
import { Profile } from '@/lib/types'

export default function SettingsPage() {
    const router = useRouter()
    const { user, isAuthenticated, loading: authLoading } = useAuth()

    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    // Form fields
    const [displayName, setDisplayName] = useState('')
    const [bio, setBio] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [themePreference, setThemePreference] = useState<'youth' | 'adult'>('youth')
    const [emailNotifications, setEmailNotifications] = useState(false)
    const [notificationEmail, setNotificationEmail] = useState('')

    const avatarPreview = avatarUrl.trim() || null

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push('/auth/login')
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (!authLoading && isAuthenticated && user) loadProfile()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated, user])

    const loadProfile = async () => {
        if (!user) return
        setLoading(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        if (data) {
            setProfile(data)
            setDisplayName(data.display_name || '')
            setBio(data.bio || '')
            setAvatarUrl(data.avatar_url || '')
            setThemePreference(data.theme_preference || 'youth')
            setEmailNotifications(data.email_notifications ?? false)
            setNotificationEmail(data.notification_email || user.email || '')
        }
        setLoading(false)
    }

    const handleSave = async () => {
        if (!user) return
        setSaving(true)
        setError('')
        const supabase = createClient()
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                display_name: displayName.trim() || null,
                bio: bio.trim() || null,
                avatar_url: avatarUrl.trim() || null,
                theme_preference: themePreference,
                email_notifications: emailNotifications,
                notification_email: notificationEmail.trim() || null,
            })
            .eq('id', user.id)

        if (updateError) {
            setError(updateError.message)
        } else {
            setSaved(true)
            // Apply theme immediately
            document.documentElement.setAttribute('data-theme', themePreference)
            setTimeout(() => setSaved(false), 3000)
        }
        setSaving(false)
    }

    if (authLoading || !isAuthenticated || loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '48px', height: '48px' }} />
            </div>
        )
    }

    return (
        <>
            <style>{`
                .settings-section {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 1.5rem;
                    margin-bottom: 1.25rem;
                    box-shadow: var(--shadow-lg);
                    backdrop-filter: blur(10px);
                }
                .settings-section-title {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-bottom: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .settings-field {
                    margin-bottom: 1.25rem;
                }
                .settings-field:last-child {
                    margin-bottom: 0;
                }
                .settings-label {
                    display: block;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }
                .settings-input {
                    width: 100%;
                    padding: 0.65rem 0.875rem;
                    background: var(--bg-primary);
                    border: 1.5px solid var(--border-color);
                    border-radius: 10px;
                    color: var(--text-primary);
                    font-family: var(--font-primary);
                    font-size: 0.9375rem;
                    transition: border-color 0.15s, box-shadow 0.15s;
                }
                .settings-input:focus {
                    outline: none;
                    border-color: var(--primary-500);
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
                }
                .settings-textarea {
                    width: 100%;
                    padding: 0.65rem 0.875rem;
                    background: var(--bg-primary);
                    border: 1.5px solid var(--border-color);
                    border-radius: 10px;
                    color: var(--text-primary);
                    font-family: var(--font-primary);
                    font-size: 0.9375rem;
                    resize: vertical;
                    min-height: 90px;
                    transition: border-color 0.15s, box-shadow 0.15s;
                    line-height: 1.5;
                }
                .settings-textarea:focus {
                    outline: none;
                    border-color: var(--primary-500);
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
                }
                .settings-hint {
                    font-size: 0.78125rem;
                    color: var(--text-muted);
                    margin-top: 0.35rem;
                }
                .theme-option {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.875rem 1rem;
                    border: 1.5px solid var(--border-color);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.15s;
                    background: var(--bg-primary);
                    flex: 1;
                }
                .theme-option:hover {
                    border-color: var(--primary-500);
                }
                .theme-option.selected {
                    border-color: var(--primary-500);
                    background: var(--primary-50);
                }
                .theme-option-dot {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }
                .settings-toggle-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                }
                .settings-toggle {
                    position: relative;
                    width: 44px;
                    height: 24px;
                    flex-shrink: 0;
                }
                .settings-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                    position: absolute;
                }
                .toggle-slider {
                    position: absolute;
                    inset: 0;
                    background: var(--border-color);
                    border-radius: 24px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .toggle-slider::before {
                    content: '';
                    position: absolute;
                    width: 18px;
                    height: 18px;
                    left: 3px;
                    top: 3px;
                    background: white;
                    border-radius: 50%;
                    transition: transform 0.2s;
                }
                .settings-toggle input:checked + .toggle-slider {
                    background: var(--primary-500);
                }
                .settings-toggle input:checked + .toggle-slider::before {
                    transform: translateX(20px);
                }
                .settings-save-btn {
                    width: 100%;
                    padding: 0.875rem;
                    background: var(--gradient-primary);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-family: var(--font-primary);
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }
                .settings-save-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-lg), var(--shadow-glow);
                }
                .settings-save-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .settings-save-btn.success {
                    background: linear-gradient(135deg, #10b981, #059669);
                }
                .back-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 14px;
                    border-radius: 8px;
                    font-family: var(--font-primary);
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                    border: 1.5px solid var(--border-color);
                    background: transparent;
                    color: var(--text-secondary);
                    margin-bottom: 1.25rem;
                }
                .back-btn:hover {
                    border-color: var(--primary-500);
                    color: var(--primary-500);
                }
                .avatar-preview-ring {
                    border: 4px solid var(--border-color);
                    border-radius: 50%;
                    display: inline-block;
                }
                .error-msg {
                    background: rgba(239,68,68,0.08);
                    border: 1px solid rgba(239,68,68,0.3);
                    border-radius: 10px;
                    padding: 0.75rem 1rem;
                    color: #ef4444;
                    font-size: 0.875rem;
                    margin-bottom: 1rem;
                }
            `}</style>

            <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>

                {/* ── Header ── */}
                <button className="back-btn" onClick={() => router.back()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back
                </button>

                <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Edit Profile
                </h2>

                {/* ── Avatar Preview ── */}
                <div className="settings-section" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div className="avatar-preview-ring">
                        <UserAvatar
                            src={avatarPreview}
                            name={displayName || user?.email || 'User'}
                            size="xl"
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div className="settings-label" style={{ marginBottom: '0.4rem' }}>Profile Photo URL</div>
                        <input
                            className="settings-input"
                            type="url"
                            placeholder="https://example.com/photo.jpg"
                            value={avatarUrl}
                            onChange={e => setAvatarUrl(e.target.value)}
                        />
                        <p className="settings-hint">Paste a direct image link. Leave blank to use initials.</p>
                    </div>
                </div>

                {/* ── Display Name & Bio ── */}
                <div className="settings-section">
                    <div className="settings-section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        Identity
                    </div>

                    <div className="settings-field">
                        <label className="settings-label">Display Name</label>
                        <input
                            className="settings-input"
                            type="text"
                            placeholder="Your name"
                            maxLength={60}
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                        />
                    </div>

                    <div className="settings-field">
                        <label className="settings-label">Bio</label>
                        <textarea
                            className="settings-textarea"
                            placeholder="Tell others a little about yourself…"
                            maxLength={200}
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                        />
                        <p className="settings-hint">{bio.length}/200 characters</p>
                    </div>
                </div>

                {/* ── Theme ── */}
                <div className="settings-section">
                    <div className="settings-section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" />
                            <line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                        Theme Preference
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            className={`theme-option${themePreference === 'youth' ? ' selected' : ''}`}
                            onClick={() => setThemePreference('youth')}
                            type="button"
                        >
                            <div
                                className="theme-option-dot"
                                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                            />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Youth</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dark & vibrant</div>
                            </div>
                            {themePreference === 'youth' && (
                                <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </button>

                        <button
                            className={`theme-option${themePreference === 'adult' ? ' selected' : ''}`}
                            onClick={() => setThemePreference('adult')}
                            type="button"
                        >
                            <div
                                className="theme-option-dot"
                                style={{ background: 'linear-gradient(135deg, #d4af37 0%, #a67c52 100%)' }}
                            />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Adult</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Light & elegant</div>
                            </div>
                            {themePreference === 'adult' && (
                                <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Notifications ── */}
                <div className="settings-section">
                    <div className="settings-section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        Notifications
                    </div>

                    <div className="settings-field">
                        <div className="settings-toggle-row">
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Email notifications</div>
                                <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Get notified of friend requests and likes
                                </div>
                            </div>
                            <label className="settings-toggle">
                                <input
                                    type="checkbox"
                                    checked={emailNotifications}
                                    onChange={e => setEmailNotifications(e.target.checked)}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                    </div>

                    {emailNotifications && (
                        <div className="settings-field" style={{ marginTop: '1rem' }}>
                            <label className="settings-label">Notification email</label>
                            <input
                                className="settings-input"
                                type="email"
                                placeholder="you@example.com"
                                value={notificationEmail}
                                onChange={e => setNotificationEmail(e.target.value)}
                            />
                            <p className="settings-hint">Defaults to your account email.</p>
                        </div>
                    )}
                </div>

                {/* ── Account info (read-only) ── */}
                <div className="settings-section">
                    <div className="settings-section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Account
                    </div>

                    <div className="settings-field">
                        <label className="settings-label">Email address</label>
                        <input
                            className="settings-input"
                            type="email"
                            value={user?.email || ''}
                            readOnly
                            style={{ opacity: 0.6, cursor: 'default' }}
                        />
                        <p className="settings-hint">Email cannot be changed here.</p>
                    </div>
                </div>

                {/* ── Error ── */}
                {error && <div className="error-msg">{error}</div>}

                {/* ── Save ── */}
                <button
                    className={`settings-save-btn${saved ? ' success' : ''}`}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <>
                            <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                            Saving…
                        </>
                    ) : saved ? (
                        <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Saved!
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </>
    )
}
