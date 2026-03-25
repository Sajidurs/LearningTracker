-- Add show_on_leaderboard column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_on_leaderboard BOOLEAN DEFAULT true;

-- Drop the function if it already exists to recreate it cleanly
DROP FUNCTION IF EXISTS get_leaderboard(text, text);

-- Create a type for the return format so PostgREST knows what the RPC returns
DO $$ BEGIN
    CREATE TYPE leaderboard_record AS (
        user_id UUID,
        full_name TEXT,
        avatar_url TEXT,
        score BIGINT,
        rank BIGINT
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION get_leaderboard(timeframe text, metric text)
RETURNS SETOF leaderboard_record
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    time_filter timestamp with time zone;
BEGIN
    -- Determine the start date for the filter based on the timeframe
    IF timeframe = 'yearly' THEN
        time_filter := now() - interval '1 year';
    ELSIF timeframe = 'monthly' THEN
        time_filter := now() - interval '30 days';
    ELSIF timeframe = 'weekly' THEN
        time_filter := now() - interval '7 days';
    ELSIF timeframe = 'daily' THEN
        time_filter := now() - interval '1 day';
    ELSE
        -- Default to all time if something else is passed
        time_filter := '1970-01-01 00:00:00'::timestamp with time zone;
    END IF;

    IF metric = 'time_spent' THEN
        RETURN QUERY
        WITH user_scores AS (
            SELECT 
                p.user_id,
                p.full_name,
                p.avatar_url,
                COALESCE(SUM(te.duration_seconds), 0)::bigint AS score
            FROM 
                public.profiles p
            LEFT JOIN 
                public.time_entries te ON p.user_id = te.user_id AND te.started_at >= time_filter
            WHERE 
                p.show_on_leaderboard = true
            GROUP BY 
                p.user_id, p.full_name, p.avatar_url
            HAVING COALESCE(SUM(te.duration_seconds), 0) > 0
        )
        SELECT 
            s.user_id,
            s.full_name,
            s.avatar_url,
            s.score,
            RANK() OVER (ORDER BY s.score DESC)::bigint as rank
        FROM user_scores s
        ORDER BY s.score DESC
        LIMIT 100;
        
    ELSIF metric = 'topics_completed' THEN
        RETURN QUERY
        WITH user_scores AS (
            SELECT 
                p.user_id,
                p.full_name,
                p.avatar_url,
                COUNT(t.id)::bigint AS score
            FROM 
                public.profiles p
            LEFT JOIN 
                public.topics t ON p.user_id = t.user_id AND t.is_completed = true AND t.updated_at >= time_filter
            WHERE 
                p.show_on_leaderboard = true
            GROUP BY 
                p.user_id, p.full_name, p.avatar_url
            HAVING COUNT(t.id) > 0
        )
        SELECT 
            s.user_id,
            s.full_name,
            s.avatar_url,
            s.score,
            RANK() OVER (ORDER BY s.score DESC)::bigint as rank
        FROM user_scores s
        ORDER BY s.score DESC
        LIMIT 100;
        
    ELSE
        -- Return empty if unknown metric
        RETURN;
    END IF;

END;
$$;
