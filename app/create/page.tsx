'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import CharacterCounter from '@/components/CharacterCounter'
import { createClient } from '@/lib/supabase/client'
import { moderatePost, getViolationMessage } from '@/lib/contentModeration'

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

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [recordingTime, setRecordingTime] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/auth/login')
        }
    }, [authLoading, isAuthenticated, router])

    // Cleanup audio URL on unmount
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl)
            }
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview)
            }
        }
    }, [audioUrl, imagePreview])

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
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Image size must be less than 5MB')
                return
            }
            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
            setImageUrl('') // Clear URL if file is selected
        }
    }

    // Remove image
    const removeImage = () => {
        setImageFile(null)
        setImagePreview(null)
        setImageUrl('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Start audio recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorderRef.current = new MediaRecorder(stream)
            audioChunksRef.current = []

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data)
            }

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                setAudioBlob(blob)
                setAudioUrl(URL.createObjectURL(blob))
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorderRef.current.start()
            setIsRecording(true)
            setRecordingTime(0)

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1)
            }, 1000)
        } catch (err) {
            setError('Could not access microphone. Please grant permission.')
        }
    }

    // Stop audio recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }

    // Remove audio
    const removeAudio = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl)
        }
        setAudioBlob(null)
        setAudioUrl(null)
        setRecordingTime(0)
    }

    // Format recording time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validation
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

        // Content moderation check
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

        // Upload image and audio to Supabase Storage if present
        let uploadedImageUrl = imageUrl
        let uploadedAudioUrl = null

        // If there's a file to upload
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop()
            const fileName = `${user?.id}/${Date.now()}.${fileExt}`

            const { data: uploadData, error: uploadError } = await supabase.storage
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

        // Upload audio if present
        if (audioBlob) {
            const fileName = `${user?.id}/${Date.now()}.webm`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('post-audio')
                .upload(fileName, audioBlob)

            if (uploadError) {
                // Storage bucket might not exist, continue without audio
                console.warn('Failed to upload audio:', uploadError.message)
            } else {
                const { data: urlData } = supabase.storage
                    .from('post-audio')
                    .getPublicUrl(fileName)

                uploadedAudioUrl = urlData.publicUrl
            }
        }

        // Filter out empty prayer points
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
                audio_url: uploadedAudioUrl,
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

                <form onSubmit={handleSubmit}>
                    {/* Service Type - First Field */}
                    <div className="form-group">
                        <label className="label" htmlFor="serviceType">
                            Service Type *
                        </label>
                        <select
                            id="serviceType"
                            className="input"
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                            required
                            style={{
                                cursor: 'pointer',
                                appearance: 'none',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 12px center',
                                backgroundSize: '20px',
                                paddingRight: '40px',
                            }}
                        >
                            <option value="">Select a service type...</option>
                            {SERVICE_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Preacher (Optional) */}
                    <div className="form-group">
                        <label className="label" htmlFor="preacher">
                            Preacher (Optional)
                        </label>
                        <input
                            id="preacher"
                            type="text"
                            className="input"
                            value={preacher}
                            onChange={(e) => setPreacher(e.target.value)}
                            placeholder="e.g., Pastor John Smith"
                        />
                    </div>

                    {/* My Word */}
                    <div className="form-group">
                        <label className="label" htmlFor="myWord">
                            1. My Word *
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
                            2. My Response *
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

                    {/* My Affirmation */}
                    <div className="form-group">
                        <label className="label" htmlFor="myAffirmation">
                            3. My Affirmation *
                        </label>
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            marginBottom: 'var(--space-sm)',
                        }}>
                            Your declaration or statement of faith
                        </p>
                        <textarea
                            id="myAffirmation"
                            className="textarea"
                            value={myAffirmation}
                            onChange={(e) => setMyAffirmation(e.target.value.substring(0, MAX_CHARS))}
                            required
                            placeholder="What are you declaring or affirming?"
                        />
                        <CharacterCounter current={myAffirmation.length} max={MAX_CHARS} />
                    </div>

                    {/* My Testimony (Optional) */}
                    <div className="form-group">
                        <label className="label" htmlFor="myTestimony">
                            4. My Testimony (Optional)
                        </label>
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            marginBottom: 'var(--space-sm)',
                        }}>
                            Share your testimony or experience
                        </p>
                        <textarea
                            id="myTestimony"
                            className="textarea"
                            value={myTestimony}
                            onChange={(e) => setMyTestimony(e.target.value.substring(0, MAX_CHARS))}
                            placeholder="Share what God has done in your life..."
                        />
                        <CharacterCounter current={myTestimony.length} max={MAX_CHARS} />
                    </div>

                    {/* Prayer Points Section */}
                    <div style={{
                        padding: 'var(--space-lg)',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--space-lg)',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--space-md)',
                        }}>
                            <h3 style={{ fontSize: '1rem', margin: 0 }}>
                                🙏 Prayer Points (Optional)
                            </h3>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                {prayerPoints.filter(p => p.trim()).length}/{MAX_PRAYER_POINTS}
                            </span>
                        </div>
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-muted)',
                            marginBottom: 'var(--space-md)',
                        }}>
                            Add up to 10 prayer points for this month
                        </p>

                        {prayerPoints.map((point, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                gap: 'var(--space-sm)',
                                marginBottom: 'var(--space-sm)',
                                alignItems: 'flex-start',
                            }}>
                                <span style={{
                                    minWidth: '24px',
                                    height: '24px',
                                    background: 'var(--primary-500)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    marginTop: '8px',
                                }}>
                                    {index + 1}
                                </span>
                                <input
                                    type="text"
                                    className="input"
                                    value={point}
                                    onChange={(e) => updatePrayerPoint(index, e.target.value)}
                                    placeholder={`Prayer point ${index + 1}...`}
                                    style={{ flex: 1 }}
                                />
                                {prayerPoints.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removePrayerPoint(index)}
                                        className="btn btn-ghost btn-sm"
                                        style={{ color: '#ef4444', minWidth: 'auto', padding: '8px' }}
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
                                style={{ marginTop: 'var(--space-sm)' }}
                            >
                                <span>➕</span>
                                <span>Add Prayer Point</span>
                            </button>
                        )}
                    </div>

                    {/* Media Attachments Section */}
                    <div style={{
                        padding: 'var(--space-lg)',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--space-lg)',
                    }}>
                        <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>
                            📎 Attachments (Optional)
                        </h3>

                        {/* Image Upload */}
                        <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                            <label className="label">Add Image</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
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
                                >
                                    <span>🖼️</span>
                                    <span>Upload Image</span>
                                </button>
                                <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>or</span>
                                <input
                                    type="url"
                                    className="input"
                                    value={imageUrl}
                                    onChange={(e) => {
                                        setImageUrl(e.target.value)
                                        setImageFile(null)
                                        setImagePreview(null)
                                    }}
                                    placeholder="Paste image URL..."
                                    style={{ flex: 1, minWidth: '200px' }}
                                />
                            </div>
                            {(imagePreview || imageUrl) && (
                                <div style={{
                                    marginTop: 'var(--space-sm)',
                                    position: 'relative',
                                    display: 'inline-block',
                                }}>
                                    <img
                                        src={imagePreview || imageUrl}
                                        alt="Preview"
                                        style={{
                                            maxWidth: '200px',
                                            maxHeight: '150px',
                                            borderRadius: 'var(--radius-md)',
                                            objectFit: 'cover',
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
                                            width: '24px',
                                            height: '24px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Link URL */}
                        <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                            <label className="label" htmlFor="linkUrl">Add Link</label>
                            <input
                                id="linkUrl"
                                type="url"
                                className="input"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://example.com/sermon-notes"
                            />
                        </div>

                        {/* Audio Recording */}
                        <div className="form-group">
                            <label className="label">Voice Note</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                                {!isRecording && !audioUrl && (
                                    <button
                                        type="button"
                                        onClick={startRecording}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        <span>🎤</span>
                                        <span>Start Recording</span>
                                    </button>
                                )}

                                {isRecording && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={stopRecording}
                                            className="btn btn-sm"
                                            style={{ background: '#ef4444', color: 'white' }}
                                        >
                                            <span>⏹️</span>
                                            <span>Stop Recording</span>
                                        </button>
                                        <span style={{
                                            color: '#ef4444',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-xs)',
                                        }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                background: '#ef4444',
                                                borderRadius: '50%',
                                                animation: 'pulse 1s infinite',
                                            }} />
                                            Recording... {formatTime(recordingTime)}
                                        </span>
                                    </>
                                )}

                                {audioUrl && !isRecording && (
                                    <div style={{
                                        display: 'flex',
                                        gap: 'var(--space-sm)',
                                        alignItems: 'center',
                                        flex: 1,
                                    }}>
                                        <audio
                                            src={audioUrl}
                                            controls
                                            style={{ flex: 1, maxWidth: '300px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={removeAudio}
                                            className="btn btn-ghost btn-sm"
                                            style={{ color: '#ef4444' }}
                                        >
                                            🗑️ Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                marginTop: 'var(--space-xs)',
                            }}>
                                Record a voice note to capture your thoughts verbally
                            </p>
                        </div>
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
                                Make this post public (others can see it in their feed)
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
    )
}
