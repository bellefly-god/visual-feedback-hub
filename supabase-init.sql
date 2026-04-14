-- Visual Feedback Hub 数据库完整初始化脚本
-- 在 Supabase SQL Editor 中执行

-- 1. 创建 replies 表
CREATE TABLE IF NOT EXISTS public.replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 为 replies 表创建索引
CREATE INDEX IF NOT EXISTS idx_replies_comment_id ON public.replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON public.replies(created_at);

-- 2. 确保 share_links 表存在（如果之前没执行）
CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_share_links_project_id ON public.share_links(project_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);

-- 3. 为 replies 表添加 RLS 策略
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view replies" ON public.replies
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert replies" ON public.replies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner can update replies" ON public.replies
    FOR UPDATE USING (true);

CREATE POLICY "Owner can delete replies" ON public.replies
    FOR DELETE USING (true);

-- 4. 确保其他表有 RLS 策略
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public can insert projects" ON public.projects FOR INSERT WITH CHECK (true);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Public can insert comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update comments" ON public.comments FOR UPDATE USING (true);
CREATE POLICY "Public can delete comments" ON public.comments FOR DELETE USING (true);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view share_links" ON public.share_links FOR SELECT USING (true);
CREATE POLICY "Public can insert share_links" ON public.share_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete share_links" ON public.share_links FOR DELETE USING (true);

-- 5. 验证所有表
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'comments', 'replies', 'share_links')
ORDER BY table_name;
