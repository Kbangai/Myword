-- ============================================================
-- Migration 006: Share Notification Trigger + Extend Type Constraint
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Extend the notifications type constraint to include 'share' ─
ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'friend_request',
        'friend_accepted',
        'friend_rejected',
        'follow',
        'like',
        'share'
    ));

-- ── 2. Notify post owner when someone SHARES their post ──────────
CREATE OR REPLACE FUNCTION public.notify_on_share()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    -- Get the post owner
    SELECT user_id INTO post_owner_id
    FROM public.posts
    WHERE id = NEW.post_id;

    -- Don't notify if sharing your own post
    IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, type, actor_id, post_id, message)
        VALUES (
            post_owner_id,
            'share',
            NEW.user_id,
            NEW.post_id,
            'shared your post'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_share_notify ON public.post_shares;
CREATE TRIGGER on_share_notify
    AFTER INSERT ON public.post_shares
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_share();

-- ── 3. (Re-)ensure the like trigger exists cleanly ───────────────
-- Idempotent — safe to run even if 003 was already applied.
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;

    IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, type, actor_id, post_id, message)
        VALUES (post_owner_id, 'like', NEW.user_id, NEW.post_id, 'liked your post');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_notify ON public.likes;
CREATE TRIGGER on_like_notify
    AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();
