-- Visual Feedback Hub - Complete Schema
-- Create tables if they don't exist

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL DEFAULT 'Untitled Project',
    description text,
    owner_id text DEFAULT 'anonymous',
    asset_url text NOT NULL,
    asset_type text NOT NULL DEFAULT 'image' CHECK (asset_type IN ('image', 'pdf')),
    thumbnail_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    settings jsonb DEFAULT '{}'::jsonb
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    author_id text DEFAULT 'anonymous',
    author_name text DEFAULT 'Anonymous',
    
    -- Annotation shape
    shape_type text NOT NULL DEFAULT 'pin' CHECK (shape_type IN ('pin', 'pen', 'arrow', 'rectangle', 'highlight', 'text')),
    
    -- Position and dimensions
    x float NOT NULL DEFAULT 0,
    y float NOT NULL DEFAULT 0,
    width float,
    height float,
    
    -- Visual properties
    color text NOT NULL DEFAULT '#2563eb',
    path_points jsonb,
    
    -- Text properties
    text_content text,
    font_size int DEFAULT 16,
    font_family text DEFAULT 'Inter',
    font_weight int DEFAULT 400,
    
    -- Content
    content text,
    voice_note_url text,
    
    -- Metadata
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fixed', 'approved')),
    display_order int DEFAULT 0,
    page int,
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON public.comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_display_order ON public.comments(display_order);
CREATE INDEX IF NOT EXISTS idx_comments_project_status ON public.comments(project_id, status);

-- Auto-set display_order trigger
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

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now - adjust for production)
CREATE POLICY "Allow all for projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for comments" ON public.comments FOR ALL USING (true) WITH CHECK (true);
