import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("https://"));

// 创建带有超时控制的 Supabase 客户端
function createTimeoutClient(url: string, key: string): SupabaseClient {
  const client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      // 添加 fetch 超时
      fetch: (url, options) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15秒超时
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));
      },
    },
  });
  
  return client;
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createTimeoutClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;