'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Post, SERVICE_TYPE_LABELS, ServiceType } from '@/lib/types'

type PeriodType = 'monthly' | 'quarterly' | 'annual'

interface SummaryStats {
    totalPosts: number
    publicPosts: number
    privatePosts: number
    serviceTypes: Record<string, number>
    allWords: string[]
    allTestimonies: string[]
    allPrayerPoints: string[]
}

export default function SummariesPage() {
    const router = useRouter()
    const { user, isAuthenticated, loading: authLoading } = useAuth()

    const [period, setPeriod] = useState<PeriodType>('monthly')
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
    const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3))
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [stats, setStats] = useState<SummaryStats | null>(null)
    const [loading, setLoading] = useState(true)

    const quarters = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)']
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    // Generate years (last 5 years)
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/auth/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (isAuthenticated && user) {
            loadSummary()
        }
    }, [isAuthenticated, user, period, selectedMonth, selectedQuarter, selectedYear])

    const getDateRange = () => {
        let startDate: Date
        let endDate: Date

        switch (period) {
            case 'monthly':
                startDate = new Date(selectedYear, selectedMonth, 1)
                endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59)
                break
            case 'quarterly':
                const quarterStartMonth = selectedQuarter * 3
                startDate = new Date(selectedYear, quarterStartMonth, 1)
                endDate = new Date(selectedYear, quarterStartMonth + 3, 0, 23, 59, 59)
                break
            case 'annual':
                startDate = new Date(selectedYear, 0, 1)
                endDate = new Date(selectedYear, 11, 31, 23, 59, 59)
                break
        }

        return { startDate, endDate }
    }

    const loadSummary = async () => {
        setLoading(true)
        const supabase = createClient()
        const { startDate, endDate } = getDateRange()

        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', user?.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false })

        if (!error && data) {
            const posts = data as Post[]

            // Calculate stats
            const serviceTypes: Record<string, number> = {}
            const allWords: string[] = []
            const allTestimonies: string[] = []
            const allPrayerPoints: string[] = []

            posts.forEach(post => {
                // Count service types
                if (post.service_type) {
                    serviceTypes[post.service_type] = (serviceTypes[post.service_type] || 0) + 1
                }

                // Collect words
                if (post.my_word) {
                    allWords.push(post.my_word)
                }

                // Collect testimonies
                const testimony = post.my_testimony || post.additional_notes
                if (testimony) {
                    allTestimonies.push(testimony)
                }

                // Collect prayer points
                if (post.prayer_points && Array.isArray(post.prayer_points)) {
                    allPrayerPoints.push(...post.prayer_points)
                }
            })

            setStats({
                totalPosts: posts.length,
                publicPosts: posts.filter(p => p.is_public).length,
                privatePosts: posts.filter(p => !p.is_public).length,
                serviceTypes,
                allWords,
                allTestimonies,
                allPrayerPoints,
            })
        }

        setLoading(false)
    }

    const getPeriodLabel = () => {
        switch (period) {
            case 'monthly':
                return `${months[selectedMonth]} ${selectedYear}`
            case 'quarterly':
                return `${quarters[selectedQuarter]} ${selectedYear}`
            case 'annual':
                return `Year ${selectedYear}`
        }
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
                <span className="gradient-text">My Summaries</span>
            </h1>

            {/* Period Selector */}
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-md)',
                    marginBottom: 'var(--space-lg)',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={() => setPeriod('monthly')}
                        className={`btn ${period === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        📅 Monthly
                    </button>
                    <button
                        onClick={() => setPeriod('quarterly')}
                        className={`btn ${period === 'quarterly' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        📊 Quarterly
                    </button>
                    <button
                        onClick={() => setPeriod('annual')}
                        className={`btn ${period === 'annual' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        📈 Annual
                    </button>
                </div>

                <div style={{
                    display: 'flex',
                    gap: 'var(--space-md)',
                    flexWrap: 'wrap',
                }}>
                    {period === 'monthly' && (
                        <select
                            className="input"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            style={{ width: '150px' }}
                        >
                            {months.map((month, index) => (
                                <option key={index} value={index}>{month}</option>
                            ))}
                        </select>
                    )}

                    {period === 'quarterly' && (
                        <select
                            className="input"
                            value={selectedQuarter}
                            onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                            style={{ width: '150px' }}
                        >
                            {quarters.map((quarter, index) => (
                                <option key={index} value={index}>{quarter}</option>
                            ))}
                        </select>
                    )}

                    <select
                        className="input"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{ width: '120px' }}
                    >
                        {years.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Header */}
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>
                Summary for {getPeriodLabel()}
            </h2>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <div className="spinner" style={{ width: '48px', height: '48px' }} />
                </div>
            ) : stats && stats.totalPosts === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>📭</div>
                    <h3>No posts in this period</h3>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Create some posts to see your summary
                    </p>
                </div>
            ) : stats && (
                <>
                    {/* Stats Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 'var(--space-md)',
                        marginBottom: 'var(--space-xl)',
                    }}>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary-500)' }}>
                                {stats.totalPosts}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Total Posts
                            </div>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                                {stats.publicPosts}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Public
                            </div>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                {stats.privatePosts}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Private
                            </div>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                                {stats.allPrayerPoints.length}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Prayer Points
                            </div>
                        </div>
                    </div>

                    {/* Service Types Breakdown */}
                    {Object.keys(stats.serviceTypes).length > 0 && (
                        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>
                                📋 Service Types
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                {Object.entries(stats.serviceTypes).map(([type, count]) => (
                                    <span key={type} className="badge badge-primary" style={{ fontSize: '0.9rem' }}>
                                        {SERVICE_TYPE_LABELS[type as ServiceType] || type}: {count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* My Words Summary */}
                    {stats.allWords.length > 0 && (
                        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>
                                📖 My Words ({stats.allWords.length})
                            </h3>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-md)',
                                maxHeight: '300px',
                                overflowY: 'auto',
                            }}>
                                {stats.allWords.map((word, index) => (
                                    <div key={index} style={{
                                        padding: 'var(--space-md)',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-md)',
                                        borderLeft: '3px solid var(--primary-500)',
                                    }}>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                            {word}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* My Testimonies Summary */}
                    {stats.allTestimonies.length > 0 && (
                        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>
                                ✨ My Testimonies ({stats.allTestimonies.length})
                            </h3>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-md)',
                                maxHeight: '300px',
                                overflowY: 'auto',
                            }}>
                                {stats.allTestimonies.map((testimony, index) => (
                                    <div key={index} style={{
                                        padding: 'var(--space-md)',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-md)',
                                        borderLeft: '3px solid var(--accent-green)',
                                    }}>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                            {testimony}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Prayer Points Summary */}
                    {stats.allPrayerPoints.length > 0 && (
                        <div className="card">
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>
                                🙏 Prayer Points ({stats.allPrayerPoints.length})
                            </h3>
                            <ul style={{
                                margin: 0,
                                paddingLeft: 'var(--space-lg)',
                                color: 'var(--text-secondary)',
                                maxHeight: '300px',
                                overflowY: 'auto',
                            }}>
                                {stats.allPrayerPoints.map((point, index) => (
                                    <li key={index} style={{ marginBottom: 'var(--space-sm)' }}>
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
