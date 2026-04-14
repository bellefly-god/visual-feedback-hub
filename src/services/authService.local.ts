/**
 * Local Authentication Service (for development/demo)
 * 
 * 使用 localStorage 模拟认证功能
 * 仅用于开发和演示，生产环境应使用 Supabase Auth
 */

import type { User } from "@/types/user";

const AUTH_STORAGE_KEY = "feedbackmark.auth.v1";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthSession {
  user: User;
  expiresAt: number;
}

// Demo users for testing
const DEMO_USERS: Record<string, { password: string; name: string }> = {
  "demo@example.com": { password: "demo123", name: "Demo User" },
  "admin@example.com": { password: "admin123", name: "Admin User" },
  "sarah@example.com": { password: "sarah123", name: "Sarah Chen" },
  "mark@example.com": { password: "mark123", name: "Mark Johnson" },
};

/**
 * Get current user from session
 */
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session: AuthSession = JSON.parse(raw);

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      clearAuth();
      return null;
    }

    return session.user;
  } catch {
    clearAuth();
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<User> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check for demo users
  const demoUser = DEMO_USERS[email.toLowerCase()];
  if (demoUser && demoUser.password === password) {
    const user: User = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      name: demoUser.name,
      createdAt: new Date().toISOString(),
    };

    const session: AuthSession = {
      user,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return user;
  }

  // For any other email/password combination, create a new user session
  if (email && password) {
    const user: User = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      createdAt: new Date().toISOString(),
    };

    const session: AuthSession = {
      user,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return user;
  }

  throw new Error("Invalid email or password");
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, name?: string): Promise<{ user: User; needsConfirmation: boolean }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Check if user already exists
  if (DEMO_USERS[email.toLowerCase()]) {
    throw new Error("An account with this email already exists");
  }

  const user: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    name: name || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    createdAt: new Date().toISOString(),
  };

  const session: AuthSession = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  
  return {
    user,
    needsConfirmation: false, // Local mode doesn't require email confirmation
  };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  clearAuth();
}

/**
 * Update user profile
 */
export async function updateProfile(updates: { name?: string; email?: string }): Promise<User> {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const updatedUser: User = {
    ...currentUser,
    name: updates.name ?? currentUser.name,
    email: updates.email ?? currentUser.email,
  };

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (raw) {
    try {
      const session: AuthSession = JSON.parse(raw);
      session.user = updatedUser;
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore parse errors
    }
  }

  return updatedUser;
}

/**
 * Send password reset email
 * Note: Not available in local mode
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  // In local mode, just simulate success
  await new Promise((resolve) => setTimeout(resolve, 500));
  // In production, you would redirect to a reset page
  console.log(`Password reset email would be sent to: ${email}`);
}

/**
 * Clear authentication data
 */
function clearAuth(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

/**
 * Local auth service object
 */
export const authService = {
  getCurrentUser,
  isAuthenticated,
  signIn,
  signUp,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
};

export default authService;
