export type ServiceType = 'sunday_service' | 'midweek_service' | 'personal_bible_study' | 'prayer_time' | 'conference' | 'others'

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
    sunday_service: 'Sunday Service',
    midweek_service: 'Midweek Service',
    personal_bible_study: 'Personal Bible Study',
    prayer_time: 'Prayer Time',
    conference: 'Conference',
    others: 'Others',
}

export interface Post {
    id: string
    user_id: string
    service_type?: ServiceType
    preacher?: string | null
    session_title?: string  // Legacy field, kept for backwards compatibility
    my_word: string
    my_response: string
    my_affirmation: string
    my_confession?: string  // Legacy field, kept for backwards compatibility
    my_testimony?: string | null
    additional_notes?: string | null  // Legacy field, kept for backwards compatibility
    prayer_points?: string[] | null
    image_url?: string | null
    link_url?: string | null
    audio_url?: string | null
    is_public: boolean
    created_at: string
    updated_at: string
    profiles?: {
        id: string
        display_name: string | null
        avatar_url: string | null
    }
}

export interface Profile {
    id: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    theme_preference: 'youth' | 'adult'
    email_notifications?: boolean
    notification_email?: string | null
    created_at: string
}

export type NotificationType = 'friend_request' | 'friend_accepted' | 'follow' | 'like'

export interface Notification {
    id: string
    user_id: string
    type: NotificationType
    actor_id: string
    post_id?: string | null
    message?: string | null
    read: boolean
    email_sent: boolean
    created_at: string
    actor?: {
        id: string
        display_name: string | null
        avatar_url: string | null
    }
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected'

export interface FriendRequest {
    id: string
    from_user_id: string
    to_user_id: string
    status: FriendRequestStatus
    created_at: string
    updated_at: string
    from_user?: {
        id: string
        display_name: string | null
        avatar_url: string | null
    }
    to_user?: {
        id: string
        display_name: string | null
        avatar_url: string | null
    }
}

export interface Friend {
    id: string
    user_id: string
    friend_id: string
    created_at: string
    friend?: {
        id: string
        display_name: string | null
        avatar_url: string | null
    }
}
