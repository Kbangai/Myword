'use client'

interface UserAvatarProps {
    src?: string | null
    name?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function UserAvatar({ src, name, size = 'md' }: UserAvatarProps) {
    const getInitials = (name?: string) => {
        if (!name) return '?'
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }

    const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : size === 'xl' ? 'avatar-xl' : ''

    return (
        <div className={`avatar ${sizeClass}`}>
            {src ? (
                <img src={src} alt={name || 'User avatar'} />
            ) : (
                <span>{getInitials(name)}</span>
            )}
        </div>
    )
}
