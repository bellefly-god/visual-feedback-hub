-- ============================================
-- Visual Feedback Hub - Database Migration
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lnwcbacqrkqcsngxymqk/sql/new
-- ============================================

-- 1. Add missing columns to comments table
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS display_order int DEFAULT 0;

ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#2563eb';

ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS path_points jsonb;

ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS text_content text;

ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS font_size int DEFAULT 16;

ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Inter';

ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS font_weight int DEFAULT 400;

-- 2. Update shape_type constraint to include 'text'
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_shape_type_check;

ALTER TABLE public.comments 
ADD CONSTRAINT comments_shape_type_check 
CHECK (shape_type IN ('pin', 'pen', 'arrow', 'rectangle', 'highlight', 'text'));

-- 3. Backfill display_order for existing comments
UPDATE public.comments 
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num 
  FROM public.comments
) AS subquery
WHERE public.comments.id = subquery.id;

-- 4. Create trigger for auto display_order on insert
CREATE OR REPLACE FUNCTION set_display_order() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
    SELECT COALESCE(MAX(display_order), 0) + 1 
    INTO NEW.display_order 
    FROM public.comments 
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_display_order_trigger ON public.comments;

CREATE TRIGGER set_display_order_trigger 
BEFORE INSERT ON public.comments
FOR EACH ROW 
EXECUTE FUNCTION set_display_order();

-- 5. Add description to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS description text;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_display_order 
ON public.comments(display_order);

CREATE INDEX IF NOT EXISTS idx_comments_project_status 
ON public.comments(project_id, status);

-- ============================================
-- Verification queries (run after migration)
-- ============================================
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'comments' ORDER BY ordinal_position;

-- SELECT * FROM comments LIMIT 5;