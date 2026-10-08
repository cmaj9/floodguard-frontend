import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AuthUser } from '../types';
import { loginApi, registerCitizenApi, registerEmailApi, setupCredentialsApi } from '../services/apiService';
import { getLiffProfile, hasLiffAuthParams, isInLineClient, logoutLiff } from '../services/liffService';
import { setPendingToast } from './ToastContext';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  district?: string;
  stationIds?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  setupCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsCitizen: (guestName?: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // If incoming request has LIFF OAuth callback parameters, don't read stale guest data
    if (hasLiffAuthParams()) {
      return null;
    }
    try {
      const saved = localStorage.getItem('wl_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          const isSynthetic = Boolean(
            parsed.email && (parsed.email.endsWith('@waterwatch.local') || parsed.email.endsWith('@floodguard.local'))
          );
          if (parsed.role === 'citizen') {
            parsed.isCredentialsSet = Boolean(parsed.isCredentialsSet || parsed.is_credentials_set) && !isSynthetic;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[AuthContext] Failed to parse saved user:', e);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // Always start loading if there are incoming LIFF callback params
    if (hasLiffAuthParams()) return true;
    try {
      const saved = localStorage.getItem('wl_auth_user');
      if (saved) return false;
    } catch {}
    return true;
  });

  const isGuest = !user || user.id === 'citizen_guest';

  useEffect(() => {
    async function initAuth() {
      const isLiffCallback = hasLiffAuthParams() || isInLineClient();

      // If we don't have pending LIFF callback or in-client session, check if a real user is already saved
      if (!isLiffCallback) {
        const saved = localStorage.getItem('wl_auth_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.id && parsed.id !== 'citizen_guest') {
              setUser(parsed);
              setIsLoading(false);
              return;
            }
          } catch {
            localStorage.removeItem('wl_auth_user');
          }
        }
      }

      // 2. Try LIFF Auto-Authentication (either from callback, in-client, or active session)
      try {
        const profile = await getLiffProfile();
        if (profile && profile.userId) {
          console.log('[AuthContext] Detected LIFF User:', profile.displayName, profile.userId);
          try {
            const citizen = await registerCitizenApi({
              lineUserId: profile.userId,
              displayName: profile.displayName || 'ผู้ใช้ LINE',
              pictureUrl: profile.pictureUrl,
            });

            const role = (citizen.role as any) || 'citizen';
            const isSet = Boolean(
              citizen.isCredentialsSet ??
              citizen.is_credentials_set ??
              (citizen.email && !citizen.email.endsWith('@waterwatch.local') && !citizen.email.endsWith('@floodguard.local'))
            );

            const citizenUser: AuthUser = {
              id: String(citizen.id || (citizen as any).user_id || `citizen_${profile.userId.slice(-6)}`),
              name: profile.displayName || citizen.name || 'ประชาชนผู้ใช้งาน',
              email: citizen.email || `citizen_${profile.userId.slice(-6)}@waterwatch.local`,
              role: role,
              stationIds: citizen.stationIds || (citizen as any).station_ids || [],
              phone: citizen.phone || '',
              district: citizen.district || '',
              lineUserId: profile.userId,
              pictureUrl: profile.pictureUrl || null,
              isCredentialsSet: isSet,
              is_credentials_set: isSet,
            };

            setUser(citizenUser);
            localStorage.setItem('wl_auth_user', JSON.stringify(citizenUser));
            if (isLiffCallback) {
              setPendingToast('เข้าสู่ระบบสำเร็จผ่าน LINE เรียบร้อยแล้ว', 'line');
            }
            setIsLoading(false);
            return;
          } catch (apiErr) {
            console.warn('[AuthContext] Backend auto-register error, falling back to local citizen profile:', apiErr);
            const fallbackCitizen: AuthUser = {
              id: `citizen_${profile.userId.slice(-6)}`,
              name: profile.displayName || 'ประชาชนผู้ใช้งาน',
              email: `citizen_${profile.userId.slice(-6)}@waterwatch.local`,
              role: 'citizen',
              stationIds: [],
              phone: '',
              district: '',
              lineUserId: profile.userId,
              pictureUrl: profile.pictureUrl || null,
              isCredentialsSet: false,
              is_credentials_set: false,
            };
            setUser(fallbackCitizen);
            localStorage.setItem('wl_auth_user', JSON.stringify(fallbackCitizen));
            setIsLoading(false);
            return;
          }
        }
      } catch (liffErr) {
        console.warn('[AuthContext] LIFF initialization warning:', liffErr);
      }

      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // Real login via Backend API (PostgreSQL + bcrypt)
      const authUser = await loginApi(email, password);
      setUser(authUser);
      localStorage.setItem('wl_auth_user', JSON.stringify(authUser));
      setIsLoading(false);
      setPendingToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับสู่ระบบ FloodGuard', 'login');
      return { success: true };
    } catch (err: any) {
      console.warn('[AuthContext] Backend login attempt failed:', err);
      const errMsg = err?.response?.data?.error || err?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      setIsLoading(false);
      return { success: false, error: errMsg };
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const authUser = await registerEmailApi(data);
      setUser(authUser);
      localStorage.setItem('wl_auth_user', JSON.stringify(authUser));
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      console.warn('[AuthContext] Register failed:', err);
      const errMsg = err?.response?.data?.error || err?.message || 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      setIsLoading(false);
      return { success: false, error: errMsg };
    }
  }, []);

  const loginAsCitizen = useCallback((guestName?: string) => {
    // If a real logged-in user already exists in localStorage, preserve it!
    const saved = localStorage.getItem('wl_auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.id !== 'citizen_guest') {
          setUser(parsed);
          return;
        }
      } catch {}
    }

    const citizenUser: AuthUser = {
      id: 'citizen_guest',
      name: guestName || 'ประชาชนทั่วไป (ผู้เยี่ยมชม)',
      email: 'citizen@floodguard.local',
      role: 'citizen',
      stationIds: [],
      phone: '',
      district: '',
    };
    setUser(citizenUser);
    localStorage.setItem('wl_auth_user', JSON.stringify(citizenUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('wl_auth_user');
    logoutLiff();
    setPendingToast('ออกจากระบบเรียบร้อยแล้ว', 'logout');
  }, []);

  const updateProfile = useCallback((data: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem('wl_auth_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setupCredentials = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      try {
        const updatedUser = await setupCredentialsApi({
          userId: user?.id,
          lineUserId: user?.lineUserId || undefined,
          email,
          password,
        });

        const finalUser: AuthUser = {
          ...user,
          ...updatedUser,
          email: updatedUser.email,
          isCredentialsSet: true,
          is_credentials_set: true,
        };
        setUser(finalUser);
        localStorage.setItem('wl_auth_user', JSON.stringify(finalUser));
        setIsLoading(false);
        return { success: true };
      } catch (err: any) {
        console.warn('[AuthContext] setupCredentials error:', err);
        const errMsg = err?.response?.data?.error || err?.message || 'ตั้งค่าอีเมลและรหัสผ่านไม่สำเร็จ';
        setIsLoading(false);
        return { success: false, error: errMsg };
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        login,
        register,
        setupCredentials,
        loginAsCitizen,
        logout,
        updateProfile,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
