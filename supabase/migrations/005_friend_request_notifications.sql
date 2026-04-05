-- ============================================================
-- Migration 005: Friend Request Notification Triggers
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 0. Extend the notifications type constraint to include friend_rejected ─
-- Drop old constraint and add new one that includes the new type
ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('friend_request', 'friend_accepted', 'friend_rejected', 'follow', 'like'));

-- ── 1. Notify recipient when a friend request is SENT ────────
-- Fires on INSERT into friend_requests (initial status = 'pending')
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire for brand-new (pending) requests
    IF NEW.status = 'pending' THEN
        INSERT INTO public.notifications (user_id, type, actor_id, message)
        VALUES (
            NEW.to_user_id,
            'friend_request',
            NEW.from_user_id,
            'sent you a friend request'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friend_request_notify ON public.friend_requests;
CREATE TRIGGER on_friend_request_notify
    AFTER INSERT ON public.friend_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_request();


-- ── 2. Notify sender when their request is ACCEPTED or REJECTED ─
-- Migration 003 already handles friend_accepted inside accept_friend_request().
-- We replace that function here to ALSO handle the rejected case,
-- and ensure the accepted notification is always created cleanly.
CREATE OR REPLACE FUNCTION public.accept_friend_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Create bidirectional friendship rows
        INSERT INTO public.friends (user_id, friend_id)
        VALUES (NEW.from_user_id, NEW.to_user_id)
        ON CONFLICT DO NOTHING;

        INSERT INTO public.friends (user_id, friend_id)
        VALUES (NEW.to_user_id, NEW.from_user_id)
        ON CONFLICT DO NOTHING;

        -- Notify the original requester that their request was accepted
        INSERT INTO public.notifications (user_id, type, actor_id, message)
        VALUES (
            NEW.from_user_id,
            'friend_accepted',
            NEW.to_user_id,
            'accepted your friend request'
        );

    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        -- Notify the original requester that their request was declined
        INSERT INTO public.notifications (user_id, type, actor_id, message)
        VALUES (
            NEW.from_user_id,
            'friend_rejected',
            NEW.to_user_id,
            'declined your friend request'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger was already created in 003; DROP + recreate to pick up the new function body
DROP TRIGGER IF EXISTS on_friend_accept ON public.friend_requests;
CREATE TRIGGER on_friend_accept
    AFTER UPDATE ON public.friend_requests
    FOR EACH ROW EXECUTE FUNCTION public.accept_friend_request();
