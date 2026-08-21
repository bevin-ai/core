import { createContext } from 'react';

export interface User {
  id: string;
  githubId: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  githubProfileUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGithub: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
