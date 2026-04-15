-- 添加 text_content 列以支持文字标注
-- 执行此 SQL 前请在 Supabase Dashboard > SQL Editor 中运行

-- 添加 text_content 列到 comments 表
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS text_content TEXT;

-- 验证列已添加
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'comments' AND column_name = 'text_content';
