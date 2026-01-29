-- Migration: Notifications and Friend Requests System
-- Run after previous migrations

-- Create friend_requests table (requires approval)
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id),
    CHECK (from_user_id != to_user_id)
);

-- Create friends table (bidirectional friendship after acceptance)
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'follow', 'like')),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add notification preferences to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user ON public.friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user ON public.friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friends_user ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests
CREATE POLICY "Users can view their friend requests"
    ON public.friend_requests FOR SELECT
    USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send friend requests"
    ON public.friend_requests FOR INSERT
    WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests sent to them"
    ON public.friend_requests FOR UPDATE
    USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their own requests"
    ON public.friend_requests FOR DELETE
    USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- RLS Policies for friends
CREATE POLICY "Users can view their friendships"
    ON public.friends FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "System can insert friends"
    ON public.friends FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove friends"
    ON public.friends FOR DELETE
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- Function to create notification on like
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    -- Get post owner
    SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
    
    -- Don't notify if liking own post
    IF post_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, type, actor_id, post_id, message)
        VALUES (post_owner_id, 'like', NEW.user_id, NEW.post_id, 'liked your post');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for like notifications
DROP TRIGGER IF EXISTS on_like_notify ON public.likes;
CREATE TRIGGER on_like_notify
    AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Function to create notification on follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, actor_id, message)
    VALUES (NEW.following_id, 'follow', NEW.follower_id, 'started following you');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for follow notifications
DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
CREATE TRIGGER on_follow_notify
    AFTER INSERT ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Function to handle friend request acceptance
CREATE OR REPLACE FUNCTION public.accept_friend_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Create bidirectional friendship
        INSERT INTO public.friends (user_id, friend_id)
        VALUES (NEW.from_user_id, NEW.to_user_id)
        ON CONFLICT DO NOTHING;
        
        INSERT INTO public.friends (user_id, friend_id)
        VALUES (NEW.to_user_id, NEW.from_user_id)
        ON CONFLICT DO NOTHING;
        
        -- Notify the requester
        INSERT INTO public.notifications (user_id, type, actor_id, message)
        VALUES (NEW.from_user_id, 'friend_accepted', NEW.to_user_id, 'accepted your friend request');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for friend acceptance
DROP TRIGGER IF EXISTS on_friend_accept ON public.friend_requests;
CREATE TRIGGER on_friend_accept
    AFTER UPDATE ON public.friend_requests
    FOR EACH ROW EXECUTE FUNCTION public.accept_friend_request();

-- Helper function to check if users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS(
        SELECT 1 FROM public.friends
        WHERE user_id = user1_id AND friend_id = user2_id
    );
$$ LANGUAGE SQL STABLE;

-- Helper function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = p_user_id AND read = FALSE;
$$ LANGUAGE SQL STABLE;

-- Comments
COMMENT ON TABLE public.friend_requests IS 'Friend requests that require approval';
COMMENT ON TABLE public.friends IS 'Accepted friendships (bidirectional)';
COMMENT ON TABLE public.notifications IS 'User notifications for friend requests, follows, and likes';
