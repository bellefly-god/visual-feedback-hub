/**
 * Authentication Service
 * 
 * 支持两种后端:
 * - localStorage (默认，用于开发/演示)
 * - Supabase Auth (生产环境)
 */

import type { User } from "@/types/user";

// 根据环境决定使用哪个认证服务
const USE_SUPABASE_AUTH = import.meta.env.VITE_USE_SUPABASE_AUTH === "true";

// 导入服务
import { authService as localAuthService } from "./authService.local";
import { supabaseAuthService } from "./supabaseAuthService";

// Type exports
export type { User } from "@/types/user";

/**
 * 获取当前用户
 */
export async function getCurrentUser(): Promise<User | null> {
  if (USE_SUPABASE_AUTH) {
    return supabaseAuthService.getCurrentUser();
  }
  return localAuthService.getCurrentUser();
}

/**
 * 检查是否已认证
 */
export async function isAuthenticated(): Promise<boolean> {
  if (USE_SUPABASE_AUTH) {
    return supabaseAuthService.isAuthenticated();
  }
  return localAuthService.isAuthenticated();
}

/**
 * 同步检查是否已认证 (用于路由保护)
 * 注意: 这是快速检查，可能不是最新的
 */
export function isAuthenticatedSync(): boolean {
  if (USE_SUPABASE_AUTH) {
    // 对于 Supabase Auth，需要异步检查
    // 这里返回 false，让组件在 useEffect 中做完整检查
    return false;
  }
  return localAuthService.isAuthenticated();
}

/**
 * 使用邮箱密码登录
 */
export async function signIn(email: string, password: string): Promise<User> {
  if (USE_SUPABASE_AUTH) {
    return supabaseAuthService.signIn(email, password);
  }
  return localAuthService.signIn(email, password);
}

/**
 * 使用邮箱密码注册
 */
export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<{ user: User | null; needsConfirmation: boolean }> {
  if (USE_SUPABASE_AUTH) {
    return supabaseAuthService.signUp(email, password, name);
  }
  return localAuthService.signUp(email, password, name);
}

/**
 * 登出
 */
export async function signOut(): Promise<void> {
  if (USE_SUPABASE_AUTH) {
    return supabaseAuthService.signOut();
  }
  return localAuthService.signOut();
}

/**
 * 更新用户资料
 */
export async function updateProfile(updates: { name?: string; email?: string }): Promise<User> {
  if (USE_SUPABASE_AUTH) {
    return supabaseAuthService.updateProfile(updates);
  }
  return localAuthService.updateProfile(updates);
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (USE_SUPABASE_AUTH) {
    return supabaseAuthService.sendPasswordResetEmail(email);
  }
  return localAuthService.sendPasswordResetEmail?.(email);
}

/**
 * 重置密码
 */
export async function resetPassword(newPassword: string): Promise<void> {
  if (USE_SUPABASE_AUTH) {
    return supabaseAuthService.resetPassword(newPassword);
  }
  throw new Error("Password reset not available in local mode");
}

/**
 * 监听认证状态变化
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  if (USE_SUPABASE_AUTH) {
    return supabaseAuthService.onAuthStateChange(callback);
  }
  // 本地模式不支持实时监听
  return () => {};
}

/**
 * Auth 服务对象
 */
export const authService = {
  getCurrentUser,
  isAuthenticated,
  isAuthenticatedSync,
  signIn,
  signUp,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  resetPassword,
  onAuthStateChange,
};

export default authService;
