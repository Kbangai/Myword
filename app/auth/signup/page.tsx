'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import CharacterCounter from '@/components/CharacterCounter'

export default function SignupPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        const supabase = createClient()

        const { data, error: signupError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        setLoading(false)

        if (signupError) {
            if (signupError.message === 'Supabase not configured') {
                setError('⚠️ SETUP REQUIRED: You are using placeholder credentials. Please update your .env.local file with your real Supabase keys to enable signup.')
            } else {
                setError(signupError.message)
            }
        } else {
            setMessage('Check your email for the confirmation link!')
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-lg)',
        }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
                <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                    <span className="gradient-text">Create Account</span>
                </h1>

                {error && (
                    <div style={{
                        padding: 'var(--space-md)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        borderRadius: 'var(--radius-md)',
                        color: '#ef4444',
                        marginBottom: 'var(--space-lg)',
                    }}>
                        {error}
                    </div>
                )}

                {message && (
                    <div style={{
                        padding: 'var(--space-md)',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid var(--accent-green)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--accent-green)',
                        marginBottom: 'var(--space-lg)',
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSignup}>
                    <div className="form-group">
                        <label className="label" htmlFor="displayName">
                            Display Name
                        </label>
                        <input
                            id="displayName"
                            type="text"
                            className="input"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                            placeholder="Your name"
                        />
                    </div>

                    <div className="form-group">
                        <label className="label" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label className="label" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            minLength={6}
                        />
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            marginTop: 'var(--space-sm)',
                        }}>
                            Minimum 6 characters
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" />
                                <span>Creating account...</span>
                            </>
                        ) : (
                            <>
                                <span>✨</span>
                                <span>Sign Up</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="divider" />

                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Already have an account?{' '}
                    <Link href="/auth/login" style={{ color: 'var(--primary-500)', fontWeight: 600 }}>
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    )
}
