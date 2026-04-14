/**
 * Supabase Auth Service
 * 
 * 真实的认证服务，使用 Supabase Auth 作为后端
 * 支持邮箱密码登录、注册、邮箱验证、密码重置等功能
 */

import { supabase } from "./supabaseClient";
import type { User } from "@/types/user";

const AUTH_STORAGE_KEY = "feedbackmark.auth.v1";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * 获取当前用户
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
      createdAt: user.created_at,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * 检查是否已认证
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * 使用邮箱密码登录
 */
export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("登录失败，请检查邮箱和密码");
  }

  return {
    id: data.user.id,
    email: data.user.email || email,
    name: data.user.user_metadata?.name || email.split("@")[0],
    createdAt: data.user.created_at,
  };
}

/**
 * 使用邮箱密码注册
 */
export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<{ user: User | null; needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split("@")[0],
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("注册失败，请稍后重试");
  }

  // 检查是否需要邮箱确认
  const needsConfirmation = data.session === null;

  if (needsConfirmation) {
    return {
      user: null,
      needsConfirmation: true,
    };
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email || email,
      name: name || email.split("@")[0],
      createdAt: data.user.created_at,
    },
    needsConfirmation: false,
  };
}

/**
 * 登出
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error("Error signing out:", error);
  }

  // 清除本地存储
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

/**
 * 更新用户资料
 */
export async function updateProfile(updates: {
  name?: string;
  email?: string;
}): Promise<User> {
  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("更新失败，请稍后重试");
  }

  return {
    id: data.user.id,
    email: data.user.email || "",
    name: data.user.user_metadata?.name || "",
    createdAt: data.user.created_at,
  };
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * 重置密码
 */
export async function resetPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * 获取会话
 */
export async function getSession(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * 监听认证状态变化
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || "",
          createdAt: session.user.created_at,
        });
      } else if (event === "SIGNED_OUT") {
        callback(null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || "",
          createdAt: session.user.created_at,
        });
      }
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Auth 服务对象
 */
export const supabaseAuthService = {
  getCurrentUser,
  isAuthenticated,
  signIn,
  signUp,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  resetPassword,
  getSession,
  onAuthStateChange,
};

export default supabaseAuthService;
