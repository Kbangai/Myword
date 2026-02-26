'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { moderatePost, getViolationMessage } from '@/lib/contentModeration'

// Web Speech API types (not in default TypeScript lib)
interface ISpeechRecognitionEvent extends Event {
    resultIndex: number
    results: { length: number;[i: number]: { isFinal: boolean;[j: number]: { transcript: string } } }
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
        subtitle: 'Your action plan based on what you learned — you can add this later',
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
        subtitle: 'Your declaration or statement of faith — you can add this later',
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

// Check Web Speech API support
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
            {/* Section Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
            }}>
                {/* Left: icon + label */}
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

                {/* Right: mic + char count */}
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

                    {/* Character count badge */}
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

            {/* Textarea */}
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

            {/* Subtitle hint */}
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

export default function CreatePage() {
    const router = useRouter()
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
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Media attachments state
    const [imageUrl, setImageUrl] = useState('')
    const [linkUrl, setLinkUrl] = useState('')
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)

    // Per-section voice recording state
    const [activeRecording, setActiveRecording] = useState<SectionKey | null>(null)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const recognitionRef = useRef<ISpeechRecognition | null>(null)

    // File input ref
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

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/auth/login')
        }
    }, [authLoading, isAuthenticated, router])

    // Cleanup image URL on unmount
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview)
            stopRecognition()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

        // Stop any existing
        stopRecognition()

        const SpeechRecognitionAPI =
            (window as WindowWithSpeech).SpeechRecognition ||
            (window as WindowWithSpeech).webkitSpeechRecognition

        if (!SpeechRecognitionAPI) return

        const recognition = new SpeechRecognitionAPI()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        let finalTranscript = ''

        recognition.onstart = () => {
            setActiveRecording(key)
            setIsTranscribing(true)
            finalTranscript = sectionValues[key] // preserve existing text
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
                setError(`Voice recognition error: ${event.error}. Please try again.`)
            }
            stopRecognition()
        }

        recognition.onend = () => {
            // Commit final transcript
            sectionSetters[key](finalTranscript.substring(0, MAX_CHARS))
            setActiveRecording(null)
            setIsTranscribing(false)
            recognitionRef.current = null
        }

        recognitionRef.current = recognition
        recognition.start()
    }, [sectionValues, sectionSetters, stopRecognition])

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

    // Handle image file selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size must be less than 5MB')
                return
            }
            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
            setImageUrl('')
        }
    }

    const removeImage = () => {
        setImageFile(null)
        setImagePreview(null)
        setImageUrl('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        stopRecognition()
        setLoading(true)
        setError('')

        if (!serviceType) {
            setError('Please select a service type')
            setLoading(false)
            return
        }

        if (myWord.length > MAX_CHARS || myResponse.length > MAX_CHARS ||
            myAffirmation.length > MAX_CHARS || myTestimony.length > MAX_CHARS) {
            setError('One or more fields exceed the 400 character limit')
            setLoading(false)
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
            setLoading(false)
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
                setLoading(false)
                return
            }

            const { data: urlData } = supabase.storage
                .from('post-images')
                .getPublicUrl(fileName)

            uploadedImageUrl = urlData.publicUrl
        }

        const filteredPrayerPoints = prayerPoints.filter(p => p.trim() !== '')

        const { error: insertError } = await supabase
            .from('posts')
            .insert({
                user_id: user?.id,
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
            })

        setLoading(false)

        if (insertError) {
            setError(insertError.message)
        } else {
            router.push('/my-journal')
        }
    }

    return (
        <>
            {/* Inline keyframe for mic pulse */}
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
                        <span className="gradient-text">Create New Post</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
                        Capture your spiritual insights from today&apos;s service
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

                    {/* Voice tip banner */}
                    {hasSpeechRecognition && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            padding: '0.625rem 0.875rem',
                            background: 'rgba(99, 102, 241, 0.07)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '8px',
                            marginBottom: 'var(--space-lg)',
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#6366f1', flexShrink: 0 }}>
                                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm7 9c0 3.53-2.61 6.44-6 6.93V20h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-2.07C7.61 17.44 5 14.53 5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 2 0z" />
                            </svg>
                            Tap the mic icon on any section to speak your entry — it will be transcribed automatically.
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Top row: Service Type + Date */}
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

                            {/* Date badge */}
                            <div style={{ paddingTop: '1.75rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.625rem 0.875rem',
                                    background: 'var(--bg-card)',
                                    border: '1.5px solid var(--border-color)',
                                    borderRadius: '10px',
                                    whiteSpace: 'nowrap',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)',
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        </div>

                        {/* Pastor/Preacher */}
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
                                placeholder="Who was preaching when I got my word"
                            />
                        </div>

                        <div className="section-divider" />

                        {/* Content Sections */}
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
                                    <span style={{ fontWeight: 400, fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: '0.375rem' }}>(Optional)</span>
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
                                    <span style={{
                                        minWidth: '22px',
                                        height: '22px',
                                        background: 'var(--primary-500)',
                                        color: 'white',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        flexShrink: 0,
                                    }}>
                                        {index + 1}
                                    </span>
                                    <input
                                        type="text"
                                        className="create-input"
                                        value={point}
                                        onChange={(e) => updatePrayerPoint(index, e.target.value)}
                                        placeholder={`Prayer point ${index + 1}...`}
                                        style={{ flex: 1, padding: '0.5rem 0.75rem' }}
                                    />
                                    {prayerPoints.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removePrayerPoint(index)}
                                            className="btn btn-ghost btn-sm"
                                            style={{ color: '#ef4444', minWidth: 'auto', padding: '6px 8px' }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}

                            {prayerPoints.length < MAX_PRAYER_POINTS && (
                                <button
                                    type="button"
                                    onClick={addPrayerPoint}
                                    className="btn btn-secondary btn-sm"
                                    style={{ marginTop: '0.5rem' }}
                                >
                                    <span>➕</span>
                                    <span>Add Prayer Point</span>
                                </button>
                            )}
                        </div>

                        {/* Add Media Section */}
                        <div style={{
                            padding: '1.125rem',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '10px',
                            marginBottom: '1.25rem',
                        }}>
                            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.875rem' }}>
                                Add Media
                                <span style={{ fontWeight: 400, fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: '0.375rem' }}>(Optional)</span>
                            </h3>

                            {/* Media buttons */}
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    style={{ display: 'none' }}
                                    id="imageUpload"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn btn-secondary btn-sm"
                                    style={{ gap: '0.5rem' }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                    Image
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const input = document.getElementById('linkInput') as HTMLInputElement
                                        if (input) input.focus()
                                    }}
                                    className="btn btn-secondary btn-sm"
                                    style={{ gap: '0.5rem' }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                    </svg>
                                    Link
                                </button>
                            </div>

                            {/* Image preview */}
                            {(imagePreview || imageUrl) && (
                                <div style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    marginBottom: '0.75rem',
                                }}>
                                    <img
                                        src={imagePreview || imageUrl}
                                        alt="Preview"
                                        style={{
                                            maxWidth: '180px',
                                            maxHeight: '130px',
                                            borderRadius: '8px',
                                            objectFit: 'cover',
                                            display: 'block',
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            right: '-8px',
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '22px',
                                            height: '22px',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Image URL input */}
                            <div style={{ marginBottom: '0.625rem' }}>
                                <input
                                    type="url"
                                    className="create-input"
                                    value={imageUrl}
                                    onChange={(e) => {
                                        setImageUrl(e.target.value)
                                        setImageFile(null)
                                        setImagePreview(null)
                                    }}
                                    placeholder="Or paste image URL..."
                                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                                />
                            </div>

                            {/* Link URL input */}
                            <input
                                id="linkInput"
                                type="url"
                                className="create-input"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="Paste a link (sermon, article, etc.)..."
                                style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                            />
                        </div>

                        {/* Privacy Toggle */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'pointer',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Make this post public (others can see it in their feed)
                                </span>
                            </label>
                        </div>

                        {/* Submit */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner" />
                                        <span>Posting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📤</span>
                                        <span>Post Entry</span>
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
        </>
    )
}
