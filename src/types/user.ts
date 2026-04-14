/**
 * User types
 */

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  expiresAt: number;
}
