export interface Post {
    id: string
    user_id: string
    session_title: string
    my_word: string
    my_response: string
    my_confession: string
    additional_notes: string | null
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
    created_at: string
}
