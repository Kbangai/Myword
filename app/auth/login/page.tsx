'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [totpCode, setTotpCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [needs2FA, setNeeds2FA] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        const { data, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (loginError) {
            setError(loginError.message)
            setLoading(false)
            return
        }

        // Check if user has 2FA enabled
        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('two_factor_enabled')
                .eq('id', data.user.id)
                .single()

            if (profile?.two_factor_enabled) {
                setNeeds2FA(true)
                setLoading(false)
                return
            }
        }

        router.push('/feed')
    }

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setError('Session expired. Please log in again.')
            setNeeds2FA(false)
            setLoading(false)
            return
        }

        // Verify TOTP code
        const { error: verifyError } = await supabase.auth.verifyOtp({
            phone: user.phone || '',
            token: totpCode,
            type: 'sms',
        })

        if (verifyError) {
            setError('Invalid code. Please try again.')
            setLoading(false)
            return
        }

        router.push('/feed')
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
                    <span className="gradient-text">Welcome Back</span>
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

                {!needs2FA ? (
                    <form onSubmit={handleLogin}>
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
                            />
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
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <span>🔑</span>
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify2FA}>
                        <p style={{
                            textAlign: 'center',
                            marginBottom: 'var(--space-lg)',
                            color: 'var(--text-secondary)',
                        }}>
                            Enter the 6-digit code from your authenticator app
                        </p>

                        <div className="form-group">
                            <label className="label" htmlFor="totpCode">
                                Verification Code
                            </label>
                            <input
                                id="totpCode"
                                type="text"
                                className="input"
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                required
                                placeholder="000000"
                                maxLength={6}
                                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            disabled={loading || totpCode.length !== 6}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <span>✅</span>
                                    <span>Verify</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setNeeds2FA(false)}
                            className="btn btn-ghost"
                            style={{ width: '100%', marginTop: 'var(--space-md)' }}
                        >
                            ← Back to login
                        </button>
                    </form>
                )}

                <div className="divider" />

                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Don't have an account?{' '}
                    <Link href="/auth/signup" style={{ color: 'var(--primary-500)', fontWeight: 600 }}>
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    )
}
