'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { moderatePost, getViolationMessage } from '@/lib/contentModeration'

// Web Speech API types
interface ISpeechRecognitionEvent extends Event {
    resultIndex: number
    results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } }
}
interface ISpeechRecognitionErrorEvent extends Event {
    error: string
}
interface ISpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    onstart: (() => void) | null
    onresult: ((event: ISpeechRecognitionEvent) => void) | null
    onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null
    onend: (() => void) | null
}
interface ISpeechRecognitionConstructor {
    new(): ISpeechRecognition
}
type WindowWithSpeech = Window & typeof globalThis & {
    SpeechRecognition?: ISpeechRecognitionConstructor
    webkitSpeechRecognition?: ISpeechRecognitionConstructor
}

const MAX_CHARS = 400
const MAX_PRAYER_POINTS = 10

const SERVICE_TYPES = [
    { value: 'sunday_service', label: 'Sunday Service' },
    { value: 'midweek_service', label: 'Midweek Service' },
    { value: 'personal_bible_study', label: 'Personal Bible Study' },
    { value: 'prayer_time', label: 'Prayer Time' },
    { value: 'conference', label: 'Conference' },
    { value: 'others', label: 'Others' },
]

type SectionKey = 'myWord' | 'myResponse' | 'myAffirmation' | 'myTestimony'

interface SectionConfig {
    key: SectionKey
    label: string
    subtitle: string
    placeholder: string
    icon: string
    color: string
    bgColor: string
    borderColor: string
    required?: boolean
}

const SECTIONS: SectionConfig[] = [
    {
        key: 'myWord',
        label: 'My Word',
        subtitle: 'The main message or scripture that spoke to you',
        placeholder: 'What word did you receive from the sermon or prayer meeting?',
        icon: '✦',
        color: '#d97706',
        bgColor: 'rgba(251, 191, 36, 0.06)',
        borderColor: 'rgba(217, 119, 6, 0.35)',
        required: true,
    },
    {
        key: 'myResponse',
        label: 'My Response',
        subtitle: 'Your action plan based on what you learned',
        placeholder: 'How will you respond to this message? What action will you take?',
        icon: '◈',
        color: '#4f46e5',
        bgColor: 'rgba(99, 102, 241, 0.06)',
        borderColor: 'rgba(79, 70, 229, 0.35)',
        required: false,
    },
    {
        key: 'myAffirmation',
        label: 'My Affirmation',
        subtitle: 'Your declaration or statement of faith',
        placeholder: 'Write your confession or affirmation based on this word...',
        icon: '✦',
        color: '#7c3aed',
        bgColor: 'rgba(124, 58, 237, 0.06)',
        borderColor: 'rgba(124, 58, 237, 0.35)',
        required: false,
    },
    {
        key: 'myTestimony',
        label: 'My Testimony',
        subtitle: 'Share your testimony or experience',
        placeholder: 'Share what God has done in your life...',
        icon: '★',
        color: '#059669',
        bgColor: 'rgba(5, 150, 105, 0.06)',
        borderColor: 'rgba(5, 150, 105, 0.35)',
        required: false,
    },
]

const hasSpeechRecognition = typeof window !== 'undefined' &&
    (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window))

interface VoiceTextSectionProps {
    section: SectionConfig
    value: string
    onChange: (val: string) => void
    activeRecording: SectionKey | null
    onStartRecording: (key: SectionKey) => void
    onStopRecording: () => void
    isTranscribing: boolean
}

function VoiceTextSection({
    section,
    value,
    onChange,
    activeRecording,
    onStartRecording,
    onStopRecording,
    isTranscribing,
}: VoiceTextSectionProps) {
    const isActive = activeRecording === section.key
    const isOtherActive = activeRecording !== null && !isActive
    const remaining = MAX_CHARS - value.length
    const isNearLimit = remaining <= 50
    const isAtLimit = remaining <= 0

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: section.color, fontSize: '1rem', lineHeight: 1 }}>
                        {section.icon}
                    </span>
                    <span style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: section.color,
                        letterSpacing: '-0.01em',
                    }}>
                        {section.label}
                        {!section.required && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.375rem' }}>
                                (Optional)
                            </span>
                        )}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    {hasSpeechRecognition && (
                        <button
                            type="button"
                            onClick={() => isActive ? onStopRecording() : onStartRecording(section.key)}
                            disabled={isOtherActive}
                            title={isActive ? 'Stop recording' : 'Record voice'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                cursor: isOtherActive ? 'not-allowed' : 'pointer',
                                background: isActive
                                    ? 'rgba(239,68,68,0.12)'
                                    : 'transparent',
                                color: isActive ? '#ef4444' : section.color,
                                opacity: isOtherActive ? 0.35 : 1,
                                transition: 'all 0.2s ease',
                                animation: isActive ? 'micPulse 1.2s ease-in-out infinite' : 'none',
                                padding: 0,
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm7 9c0 3.53-2.61 6.44-6 6.93V20h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-2.07C7.61 17.44 5 14.53 5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 2 0z" />
                            </svg>
                        </button>
                    )}

                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '36px',
                        height: '24px',
                        padding: '0 6px',
                        borderRadius: '12px',
                        border: `1px solid ${isAtLimit ? '#ef4444' : isNearLimit ? '#f97316' : 'var(--border-color)'}`,
                        background: isAtLimit ? 'rgba(239,68,68,0.08)' : isNearLimit ? 'rgba(249,115,22,0.08)' : 'transparent',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: isAtLimit ? '#ef4444' : isNearLimit ? '#f97316' : 'var(--text-muted)',
                        transition: 'all 0.2s',
                    }}>
                        {remaining}
                    </span>
                </div>
            </div>

            <div style={{ position: 'relative' }}>
                <textarea
                    id={section.key}
                    value={value}
                    onChange={(e) => onChange(e.target.value.substring(0, MAX_CHARS))}
                    required={section.required}
                    placeholder={isActive ? '🎤 Listening...' : section.placeholder}
                    rows={4}
                    style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        background: isActive ? 'rgba(239,68,68,0.04)' : section.bgColor,
                        border: `1.5px solid ${isActive ? '#ef4444' : section.borderColor}`,
                        borderRadius: '10px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-primary)',
                        fontSize: '0.9375rem',
                        lineHeight: 1.6,
                        resize: 'vertical',
                        outline: 'none',
                        transition: 'border-color 0.2s, background 0.2s',
                        boxShadow: isActive ? `0 0 0 3px rgba(239,68,68,0.12)` : 'none',
                        minHeight: '110px',
                    }}
                />
                {isActive && isTranscribing && (
                    <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.75rem',
                        color: '#ef4444',
                        fontWeight: 500,
                    }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            display: 'inline-block',
                            animation: 'micPulse 1s ease-in-out infinite',
                        }} />
                        Recording
                    </div>
                )}
            </div>

            <p style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: '0.375rem',
                marginBottom: 0,
            }}>
                {section.subtitle}
            </p>
        </div>
    )
}

export default function EditPostPage() {
    const router = useRouter()
    const { postId } = useParams()
    const { user, isAuthenticated, loading: authLoading } = useAuth()

    // Form state
    const [serviceType, setServiceType] = useState('')
    const [preacher, setPreacher] = useState('')
    const [myWord, setMyWord] = useState('')
    const [myResponse, setMyResponse] = useState('')
    const [myAffirmation, setMyAffirmation] = useState('')
    const [myTestimony, setMyTestimony] = useState('')
    const [prayerPoints, setPrayerPoints] = useState<string[]>([''])
    const [isPublic, setIsPublic] = useState(true)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    // Media attachments state
    const [imageUrl, setImageUrl] = useState('')
    const [linkUrl, setLinkUrl] = useState('')
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)

    // Voice recording state
    const [activeRecording, setActiveRecording] = useState<SectionKey | null>(null)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const recognitionRef = useRef<ISpeechRecognition | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const sectionValues: Record<SectionKey, string> = {
        myWord,
        myResponse,
        myAffirmation,
        myTestimony,
    }

    const sectionSetters: Record<SectionKey, (v: string) => void> = {
        myWord: setMyWord,
        myResponse: setMyResponse,
        myAffirmation: setMyAffirmation,
        myTestimony: setMyTestimony,
    }

    // Load post data
    useEffect(() => {
        const loadPost = async () => {
            if (!postId) return
            const supabase = createClient()
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('id', postId)
                .single()

            if (error) {
                setError('Failed to load post: ' + error.message)
                setLoading(false)
                return
            }

            if (data) {
                // Check if user owns the post
                if (user && data.user_id !== user.id) {
                    setError('You do not have permission to edit this post')
                    setLoading(false)
                    return
                }

                setServiceType(data.service_type || '')
                setPreacher(data.preacher || '')
                setMyWord(data.my_word || '')
                setMyResponse(data.my_response || '')
                setMyAffirmation(data.my_affirmation || '')
                setMyTestimony(data.my_testimony || '')
                setPrayerPoints(data.prayer_points || [''])
                setIsPublic(data.is_public)
                setImageUrl(data.image_url || '')
                setLinkUrl(data.link_url || '')
                if (data.image_url) setImagePreview(data.image_url)
            }
            setLoading(false)
        }

        if (!authLoading && isAuthenticated && user) {
            loadPost()
        }
    }, [postId, authLoading, isAuthenticated, user])

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/auth/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        return () => {
            if (imagePreview && !imagePreview.startsWith('http')) URL.revokeObjectURL(imagePreview)
            stopRecognition()
        }
    }, [])

    const stopRecognition = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            recognitionRef.current = null
        }
        setActiveRecording(null)
        setIsTranscribing(false)
    }, [])

    const startRecording = useCallback((key: SectionKey) => {
        if (!hasSpeechRecognition) return
        stopRecognition()

        const SpeechRecognitionAPI =
            (window as WindowWithSpeech).SpeechRecognition ||
            (window as WindowWithSpeech).webkitSpeechRecognition

        if (!SpeechRecognitionAPI) return

        const recognition = new SpeechRecognitionAPI()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        let finalTranscript = sectionValues[key]

        recognition.onstart = () => {
            setActiveRecording(key)
            setIsTranscribing(true)
        }

        recognition.onresult = (event: ISpeechRecognitionEvent) => {
            let interimTranscript = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript
                if (event.results[i].isFinal) {
                    finalTranscript += (finalTranscript && !finalTranscript.endsWith(' ') ? ' ' : '') + transcript
                } else {
                    interimTranscript += transcript
                }
            }
            const combined = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).substring(0, MAX_CHARS)
            sectionSetters[key](combined)
        }

        recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
            if (event.error !== 'aborted') {
                setError(`Voice recognition error: ${event.error}`)
            }
            stopRecognition()
        }

        recognition.onend = () => {
            sectionSetters[key](finalTranscript.substring(0, MAX_CHARS))
            setActiveRecording(null)
            setIsTranscribing(false)
            recognitionRef.current = null
        }

        recognitionRef.current = recognition
        recognition.start()
    }, [sectionValues, sectionSetters, stopRecognition])

    // Prayer Points handlers
    const addPrayerPoint = () => {
        if (prayerPoints.length < MAX_PRAYER_POINTS) {
            setPrayerPoints([...prayerPoints, ''])
        }
    }

    const removePrayerPoint = (index: number) => {
        const newPoints = prayerPoints.filter((_, i) => i !== index)
        setPrayerPoints(newPoints.length > 0 ? newPoints : [''])
    }

    const updatePrayerPoint = (index: number, value: string) => {
        const newPoints = [...prayerPoints]
        newPoints[index] = value
        setPrayerPoints(newPoints)
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size must be less than 5MB')
                return
            }
            setImageFile(file)
            if (imagePreview && !imagePreview.startsWith('http')) URL.revokeObjectURL(imagePreview)
            setImagePreview(URL.createObjectURL(file))
            setImageUrl('')
        }
    }

    const removeImage = () => {
        setImageFile(null)
        if (imagePreview && !imagePreview.startsWith('http')) URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
        setImageUrl('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        stopRecognition()
        setSubmitting(true)
        setError('')

        if (!serviceType) {
            setError('Please select a service type')
            setSubmitting(false)
            return
        }

        const moderationResult = moderatePost({
            preacher,
            myWord,
            myResponse,
            myAffirmation,
            myTestimony,
            prayerPoints: prayerPoints.filter(p => p.trim()),
        })

        if (!moderationResult.isClean) {
            setError(getViolationMessage(moderationResult))
            setSubmitting(false)
            return
        }

        const supabase = createClient()
        let uploadedImageUrl = imageUrl

        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop()
            const fileName = `${user?.id}/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('post-images')
                .upload(fileName, imageFile)

            if (uploadError) {
                setError('Failed to upload image: ' + uploadError.message)
                setSubmitting(false)
                return
            }

            const { data: urlData } = supabase.storage
                .from('post-images')
                .getPublicUrl(fileName)

            uploadedImageUrl = urlData.publicUrl
        }

        const filteredPrayerPoints = prayerPoints.filter(p => p.trim() !== '')

        const { error: updateError } = await supabase
            .from('posts')
            .update({
                service_type: serviceType,
                preacher: preacher || null,
                my_word: myWord,
                my_response: myResponse,
                my_affirmation: myAffirmation,
                my_testimony: myTestimony || null,
                prayer_points: filteredPrayerPoints.length > 0 ? filteredPrayerPoints : null,
                image_url: uploadedImageUrl || null,
                link_url: linkUrl || null,
                is_public: isPublic,
                updated_at: new Date().toISOString(),
            })
            .eq('id', postId)

        setSubmitting(false)

        if (updateError) {
            setError(updateError.message)
        } else {
            router.push('/my-journal')
        }
    }

    if (authLoading || loading) {
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
        <>
            <style>{`
                @keyframes micPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.15); }
                }
                .create-select {
                    width: 100%;
                    padding: 0.75rem 2.5rem 0.75rem 1rem;
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                    border-radius: 10px;
                    color: var(--text-primary);
                    font-family: var(--font-primary);
                    font-size: 0.9375rem;
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    background-size: 18px;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .create-select:focus {
                    outline: none;
                    border-color: var(--primary-500);
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
                }
                .create-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                    border-radius: 10px;
                    color: var(--text-primary);
                    font-family: var(--font-primary);
                    font-size: 0.9375rem;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .create-input:focus {
                    outline: none;
                    border-color: var(--primary-500);
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
                }
                .section-divider {
                    height: 1px;
                    background: var(--border-color);
                    margin: 1.25rem 0;
                }
            `}</style>

            <div className="container-sm" style={{ padding: 'var(--space-2xl) var(--space-lg)' }}>
                <div className="card">
                    <h1 style={{ marginBottom: 'var(--space-sm)' }}>
                        <span className="gradient-text">Edit Post</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
                        Update your spiritual insights
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
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: '0.75rem',
                            alignItems: 'start',
                            marginBottom: '1.25rem',
                        }}>
                            <div>
                                <label className="label" htmlFor="serviceType">
                                    Service Type *
                                </label>
                                <select
                                    id="serviceType"
                                    className="create-select"
                                    value={serviceType}
                                    onChange={(e) => setServiceType(e.target.value)}
                                    required
                                >
                                    <option value="">Select service type...</option>
                                    {SERVICE_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="label" htmlFor="preacher">
                                Pastor Name (Optional)
                            </label>
                            <input
                                id="preacher"
                                type="text"
                                className="create-input"
                                value={preacher}
                                onChange={(e) => setPreacher(e.target.value)}
                                placeholder="Who was preaching"
                            />
                        </div>

                        <div className="section-divider" />

                        {SECTIONS.map((section) => (
                            <VoiceTextSection
                                key={section.key}
                                section={section}
                                value={sectionValues[section.key]}
                                onChange={sectionSetters[section.key]}
                                activeRecording={activeRecording}
                                onStartRecording={startRecording}
                                onStopRecording={stopRecognition}
                                isTranscribing={isTranscribing}
                            />
                        ))}

                        <div className="section-divider" />

                        {/* Prayer Points */}
                        <div style={{
                            padding: '1.125rem',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '10px',
                            marginBottom: '1.25rem',
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.75rem',
                            }}>
                                <h3 style={{ fontSize: '0.9375rem', margin: 0, fontWeight: 700 }}>
                                    🙏 Prayer Points
                                </h3>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                    {prayerPoints.filter(p => p.trim()).length}/{MAX_PRAYER_POINTS}
                                </span>
                            </div>

                            {prayerPoints.map((point, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem',
                                    alignItems: 'center',
                                }}>
                                    <input
                                        type="text"
                                        className="create-input"
                                        value={point}
                                        onChange={(e) => updatePrayerPoint(index, e.target.value)}
                                        placeholder={`Prayer point ${index + 1}...`}
                                        style={{ flex: 1, padding: '0.5rem 0.75rem' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePrayerPoint(index)}
                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addPrayerPoint}
                                disabled={prayerPoints.length >= MAX_PRAYER_POINTS}
                                className="btn btn-ghost btn-sm"
                                style={{ marginTop: '0.5rem', width: '100%' }}
                            >
                                + Add Prayer Point
                            </button>
                        </div>

                        {/* Image Upload */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="label">Image (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                            />
                            {imagePreview ? (
                                <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                    <img 
                                        src={imagePreview} 
                                        alt="Preview" 
                                        style={{ width: '100%', borderRadius: '10px', maxHeight: '300px', objectFit: 'cover' }} 
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        style={{
                                            position: 'absolute',
                                            top: '10px',
                                            right: '10px',
                                            background: 'rgba(0,0,0,0.5)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '24px',
                                            height: '24px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn btn-ghost"
                                    style={{ width: '100%', border: '1.5px dashed var(--border-color)' }}
                                >
                                    📷 Upload Image
                                </button>
                            )}
                        </div>

                        {/* Visibility */}
                        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <label htmlFor="isPublic" style={{ fontSize: '0.9375rem', cursor: 'pointer' }}>
                                Make this post public (will show on local feed)
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn btn-primary"
                                style={{ flex: 2 }}
                            >
                                {submitting ? 'Updating...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}
