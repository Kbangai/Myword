'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import CharacterCounter from '@/components/CharacterCounter'
import { createClient } from '@/lib/supabase/client'

const MAX_CHARS = 400

export default function CreatePage() {
    const router = useRouter()
    const { user, isAuthenticated } = useAuth()
    const [sessionTitle, setSessionTitle] = useState('')
    const [myWord, setMyWord] = useState('')
    const [myResponse, setMyResponse] = useState('')
    const [myConfession, setMyConfession] = useState('')
    const [additionalNotes, setAdditionalNotes] = useState('')
    const [isPublic, setIsPublic] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    if (!isAuthenticated) {
        router.push('/auth/login')
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validation
        if (myWord.length > MAX_CHARS || myResponse.length > MAX_CHARS ||
            myConfession.length > MAX_CHARS || additionalNotes.length > MAX_CHARS) {
            setError('One or more fields exceed the 400 character limit')
            setLoading(false)
            return
        }

        const supabase = createClient()

        const { error: insertError } = await supabase
            .from('posts')
            .insert({
                user_id: user?.id,
                session_title: sessionTitle,
                my_word: myWord,
                my_response: myResponse,
                my_confession: myConfession,
                additional_notes: additionalNotes || null,
                is_public: isPublic,
            })

        setLoading(false)

        if (insertError) {
            setError(insertError.message)
        } else {
            router.push('/my-journal')
        }
    }

    return (
        <div className="container-sm" style={{ padding: 'var(--space-2xl) var(--space-lg)' }}>
            <div className="card">
                <h1 style={{ marginBottom: 'var(--space-sm)' }}>
                    <span className="gradient-text">Create New Entry</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
                    Capture your spiritual insights from today's service
                </p>

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

                <form onSubmit={handleSubmit}>
                    {/* Session Title */}
                    <div className="form-group">
                        <label className="label" htmlFor="sessionTitle">
                            Session Title
                        </label>
                        <input
                            id="sessionTitle"
                            type="text"
                            className="input"
                            value={sessionTitle}
                            onChange={(e) => setSessionTitle(e.target.value)}
                            required
                            placeholder="e.g., Sunday Morning Service - Faith & Hope"
                        />
                    </div>

                    {/* My Word */}
                    <div className="form-group">
                        <label className="label" htmlFor="myWord">
                            1. My Word
                        </label>
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            marginBottom: 'var(--space-sm)',
                        }}>
                            The main message or scripture that spoke to you
                        </p>
                        <textarea
                            id="myWord"
                            className="textarea"
                            value={myWord}
                            onChange={(e) => setMyWord(e.target.value.substring(0, MAX_CHARS))}
                            required
                            placeholder="What word did you receive from the sermon or prayer meeting?"
                        />
                        <CharacterCounter current={myWord.length} max={MAX_CHARS} />
                    </div>

                    {/* My Response */}
                    <div className="form-group">
                        <label className="label" htmlFor="myResponse">
                            2. My Response
                        </label>
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            marginBottom: 'var(--space-sm)',
                        }}>
                            Your action plan based on what you learned
                        </p>
                        <textarea
                            id="myResponse"
                            className="textarea"
                            value={myResponse}
                            onChange={(e) => setMyResponse(e.target.value.substring(0, MAX_CHARS))}
                            required
                            placeholder="What will you do based on this word?"
                        />
                        <CharacterCounter current={myResponse.length} max={MAX_CHARS} />
                    </div>

                    {/* My Confession */}
                    <div className="form-group">
                        <label className="label" htmlFor="myConfession">
                            3. My Confession
                        </label>
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            marginBottom: 'var(--space-sm)',
                        }}>
                            Your affirmation or commitment
                        </p>
                        <textarea
                            id="myConfession"
                            className="textarea"
                            value={myConfession}
                            onChange={(e) => setMyConfession(e.target.value.substring(0, MAX_CHARS))}
                            required
                            placeholder="What are you declaring or committing to?"
                        />
                        <CharacterCounter current={myConfession.length} max={MAX_CHARS} />
                    </div>

                    {/* Additional Notes (Optional) */}
                    <div className="form-group">
                        <label className="label" htmlFor="additionalNotes">
                            4. Additional Notes (Optional)
                        </label>
                        <textarea
                            id="additionalNotes"
                            className="textarea"
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value.substring(0, MAX_CHARS))}
                            placeholder="Any other thoughts or reflections..."
                        />
                        <CharacterCounter current={additionalNotes.length} max={MAX_CHARS} />
                    </div>

                    {/* Privacy Toggle */}
                    <div className="form-group">
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-md)',
                            cursor: 'pointer',
                        }}>
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    cursor: 'pointer',
                                }}
                            />
                            <span style={{ color: 'var(--text-secondary)' }}>
                                Make this entry public (others can see it in their feed)
                            </span>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-md)',
                        marginTop: 'var(--space-xl)',
                    }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <span>💾</span>
                                    <span>Save Entry</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn btn-secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
