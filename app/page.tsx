import Link from 'next/link'

export default function HomePage() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--gradient-primary)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background decoration */}
            <div style={{
                position: 'absolute',
                top: '10%',
                right: '10%',
                width: '400px',
                height: '400px',
                background: 'var(--gradient-accent)',
                borderRadius: '50%',
                filter: 'blur(100px)',
                opacity: 0.3,
            }} />
            <div style={{
                position: 'absolute',
                bottom: '10%',
                left: '10%',
                width: '300px',
                height: '300px',
                background: 'var(--gradient-secondary)',
                borderRadius: '50%',
                filter: 'blur(100px)',
                opacity: 0.3,
            }} />

            <div className="container-sm" style={{
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
            }}>
                <h1 style={{
                    fontSize: '4rem',
                    fontWeight: 900,
                    marginBottom: 'var(--space-lg)',
                    color: 'white',
                    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }} className="animate-slide-up">
                    My Word
                </h1>

                <p style={{
                    fontSize: '1.5rem',
                    marginBottom: 'var(--space-2xl)',
                    color: 'rgba(255,255,255,0.9)',
                    maxWidth: '600px',
                    margin: '0 auto var(--space-2xl)',
                }} className="animate-slide-up">
                    Capture your spiritual journey. Reflect on God&apos;s word. Share your faith with others.
                </p>

                <div style={{
                    display: 'flex',
                    gap: 'var(--space-md)',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                }} className="animate-slide-up">
                    <Link href="/auth/signup" className="btn btn-lg" style={{
                        background: 'white',
                        color: 'var(--primary-600)',
                    }}>
                        <span>✨</span>
                        <span>Get Started</span>
                    </Link>
                    <Link href="/auth/login" className="btn btn-lg" style={{
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '2px solid white',
                        backdropFilter: 'blur(10px)',
                    }}>
                        <span>🔑</span>
                        <span>Sign In</span>
                    </Link>
                </div>

                <div style={{
                    marginTop: 'var(--space-3xl)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: 'var(--space-lg)',
                    maxWidth: '900px',
                    margin: 'var(--space-3xl) auto 0',
                }}>
                    {[
                        {
                            icon: '✍️',
                            title: 'Reflect & Write',
                            description: 'Capture your thoughts after each service with guided prompts',
                        },
                        {
                            icon: '🤝',
                            title: 'Share & Connect',
                            description: 'Build community by sharing your spiritual journey with others',
                        },
                        {
                            icon: '📖',
                            title: 'Track Growth',
                            description: 'Review your personal journal and see how you\'ve grown in faith',
                        },
                    ].map((feature, index) => (
                        <div
                            key={index}
                            className="card"
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: 'white',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>
                                {feature.icon}
                            </div>
                            <h3 style={{ marginBottom: 'var(--space-sm)', color: 'white' }}>
                                {feature.title}
                            </h3>
                            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 0 }}>
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
