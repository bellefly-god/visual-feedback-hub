const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lnwcbacqrkqcsngxyqmk.supabase.co',
  'sb_publishable_GAPVrXbud2mA5c2kCwRo3Q_jHqG1jF1'
);

async function setup() {
  console.log('🔧 开始配置 Visual Feedback Hub 数据库...\n');

  // 1. 创建 share_links 表
  console.log('1️⃣ 创建 share_links 表...');
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.share_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      is_public BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ
    );
  `;

  try {
    // 使用 rpc 调用 postgres 函数（如果已启用）
    const { error: tableError } = await supabase.rpc('pg_execute', { 
      sql: createTableSQL 
    });
    
    if (tableError) {
      // 如果 rpc 不可用，尝试直接插入来检查表是否存在
      const { error: selectError } = await supabase.from('share_links').select('count').limit(1);
      
      if (selectError) {
        console.log('❌ share_links 表不存在');
        console.log('   请手动在 Supabase SQL Editor 中执行:');
        console.log('');
        console.log('   CREATE TABLE IF NOT EXISTS public.share_links (');
        console.log('     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
        console.log('     project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,');
        console.log('     token TEXT NOT NULL UNIQUE,');
        console.log('     is_public BOOLEAN DEFAULT true,');
        console.log('     created_at TIMESTAMPTZ DEFAULT now(),');
        console.log('     expires_at TIMESTAMPTZ');
        console.log('   );');
        return;
      }
    }
    
    console.log('✅ share_links 表已创建');
  } catch (err) {
    console.log('❌ 创建表失败:', err.message);
    console.log('');
    console.log('请在 Supabase SQL Editor 中执行以下 SQL:');
    console.log('');
    console.log('CREATE TABLE IF NOT EXISTS public.share_links (');
    console.log('  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
    console.log('  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,');
    console.log('  token TEXT NOT NULL UNIQUE,');
    console.log('  is_public BOOLEAN DEFAULT true,');
    console.log('  created_at TIMESTAMPTZ DEFAULT now(),');
    console.log('  expires_at TIMESTAMPTZ');
    console.log(');');
    return;
  }

  // 2. 创建存储桶
  console.log('\n2️⃣ 创建 feedback-assets 存储桶...');
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('❌ 无法访问存储服务:', bucketError.message);
      console.log('   请在 Supabase Dashboard > Storage 中手动创建名为 "feedback-assets" 的存储桶');
      console.log('   并设置为公开访问');
      return;
    }
    
    const feedbackAssetsBucket = buckets?.find(b => b.name === 'feedback-assets');
    
    if (!feedbackAssetsBucket) {
      console.log('📦 存储桶不存在，需要手动创建');
      console.log('');
      console.log('请在 Supabase Dashboard > Storage 中:');
      console.log('1. 点击 "New bucket"');
      console.log('2. 名称输入: feedback-assets');
      console.log('3. 勾选 "Public bucket"');
      console.log('4. 点击 "Create bucket"');
    } else {
      console.log('✅ 存储桶已存在:', feedbackAssetsBucket.name);
    }
  } catch (err) {
    console.log('❌ 检查存储桶失败:', err.message);
  }

  // 3. 验证所有表
  console.log('\n3️⃣ 验证数据库表...');
  const tables = ['projects', 'comments', 'share_links'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log('❌ ' + table + ': ' + error.message);
      } else {
        console.log('✅ ' + table + ' 表正常');
      }
    } catch (err) {
      console.log('❌ ' + table + ': ' + err.message);
    }
  }

  console.log('\n✨ 配置完成!');
  console.log('');
  console.log('注意: 如果 share_links 表仍不存在，请在 Supabase SQL Editor 中执行:');
  console.log('CREATE TABLE IF NOT EXISTS public.share_links (...);');
}

setup().catch(console.error);
