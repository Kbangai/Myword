import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
    title: 'My Word - Capture Your Spiritual Journey',
    description: 'A Christian platform for capturing and sharing spiritual insights after church services',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" data-theme="youth">
            <body>
                <Navigation />
                <main>{children}</main>
            </body>
        </html>
    )
}
