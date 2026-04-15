-- Visual Feedback Hub 数据库安全策略
-- 在 Supabase SQL Editor 中执行

-- ============================================
-- 1. 备份现有策略（如果需要回滚）
-- ============================================

-- 查看现有策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- ============================================
-- 2. 删除过于宽松的现有策略
-- ============================================

-- 删除所有现有策略
DROP POLICY IF EXISTS "Public access projects" ON public.projects;
DROP POLICY IF EXISTS "Public access comments" ON public.comments;
DROP POLICY IF EXISTS "Public access replies" ON public.replies;
DROP POLICY IF EXISTS "Public access share_links" ON public.share_links;

-- ============================================
-- 3. 创建安全策略
-- ============================================

-- projects 表策略
-- 读取：只能读取自己的项目或 owner-demo 的项目（公开 demo）
CREATE POLICY "Users can read own projects" ON public.projects
FOR SELECT USING (
  owner_id = 'owner-demo' OR owner_id = auth.uid()::text
);

-- 插入：已登录用户创建的项目自动绑定用户 ID
CREATE POLICY "Users can create projects" ON public.projects
FOR INSERT WITH CHECK (
  owner_id = 'owner-demo' OR owner_id = auth.uid()::text
);

-- 更新：只有项目所有者可以更新
CREATE POLICY "Owner can update projects" ON public.projects
FOR UPDATE USING (
  owner_id = auth.uid()::text
);

-- 删除：只有项目所有者可以删除
CREATE POLICY "Owner can delete projects" ON public.projects
FOR DELETE USING (
  owner_id = auth.uid()::text
);

-- comments 表策略
-- 读取：任何人都可以读取
CREATE POLICY "Anyone can read comments" ON public.comments
FOR SELECT USING (true);

-- 插入：任何人可以创建评论（需要提供 author_name 用于匿名场景）
CREATE POLICY "Anyone can create comments" ON public.comments
FOR INSERT WITH CHECK (true);

-- 更新：只有评论作者或项目所有者可以更新状态
CREATE POLICY "Author or owner can update comments" ON public.comments
FOR UPDATE USING (
  author_name = 'You' OR 
  author_name = 'Anonymous' OR
  project_id IN (
    SELECT id FROM public.projects 
    WHERE owner_id = 'owner-demo' OR owner_id = auth.uid()::text
  )
);

-- 删除：只有评论作者或项目所有者可以删除
CREATE POLICY "Author or owner can delete comments" ON public.comments
FOR DELETE USING (
  author_name = 'You' OR
  author_name = 'Anonymous' OR
  project_id IN (
    SELECT id FROM public.projects 
    WHERE owner_id = 'owner-demo' OR owner_id = auth.uid()::text
  )
);

-- replies 表策略
-- 读取：任何人都可以读取
CREATE POLICY "Anyone can read replies" ON public.replies
FOR SELECT USING (true);

-- 插入：任何人可以添加回复
CREATE POLICY "Anyone can create replies" ON public.replies
FOR INSERT WITH CHECK (true);

-- 更新/删除：只有回复作者可以修改
CREATE POLICY "Author can update replies" ON public.replies
FOR UPDATE USING (author_name = 'You' OR author_name = 'Anonymous');
CREATE POLICY "Author can delete replies" ON public.replies
FOR DELETE USING (author_name = 'You' OR author_name = 'Anonymous');

-- share_links 表策略
-- 读取：任何人都可以读取（用于分享链接）
CREATE POLICY "Anyone can read share_links" ON public.share_links
FOR SELECT USING (true);

-- 插入：只有项目所有者可以创建分享链接
CREATE POLICY "Owner can create share_links" ON public.share_links
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE owner_id = 'owner-demo' OR owner_id = auth.uid()::text
  )
);

-- 删除：只有项目所有者可以删除分享链接
CREATE POLICY "Owner can delete share_links" ON public.share_links
FOR DELETE USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE owner_id = 'owner-demo' OR owner_id = auth.uid()::text
  )
);

-- ============================================
-- 4. 验证策略
-- ============================================

-- 查看创建后的策略
SELECT schemaname, tablename, policyname, cmd, permissive, roles
FROM pg_policies
WHERE schemaname = 'public';

-- 测试查询（以 anon 用户身份）
-- SELECT * FROM public.projects LIMIT 1;

-- ============================================
-- 5. 审计日志表（可选）
-- ============================================

-- 创建审计日志表
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 审计日志策略：只有管理员可以查看
CREATE POLICY "Admin can read audit_logs" ON public.audit_logs
FOR SELECT USING (auth.uid()::text = 'admin' OR auth.jwt()->>'role' = 'admin');

-- ============================================
-- 6. 速率限制配置（可选）
-- ============================================

-- Supabase Vault 用于存储速率限制配置
-- 需要 Supabase Pro 计划

-- ============================================
-- 7. 回滚脚本
-- ============================================

/*
如果需要回滚到开放策略，执行以下脚本：

-- 删除所有策略
DROP POLICY IF EXISTS "Anyone can read projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can create projects" ON public.projects;
DROP POLICY IF EXISTS "Owner can update projects" ON public.projects;
DROP POLICY IF EXISTS "Owner can delete projects" ON public.projects;
-- ... 对其他表重复

-- 恢复开放策略
CREATE POLICY "Public access projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access comments" ON public.comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access replies" ON public.replies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access share_links" ON public.share_links FOR ALL USING (true) WITH CHECK (true);
*/
