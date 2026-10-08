/**
 * LIFF Helper Service
 * Manages LINE Front-end Framework (LIFF) lifecycle and authentication
 */
import liff from '@line/liff';

export interface LiffUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

/**
 * LIFF ID is public (it appears in every https://liff.line.me/<ID> link), so a
 * hardcoded fallback is safe. It protects production builds where the Vercel
 * environment variable VITE_LIFF_ID is missing (.env files are gitignored).
 */
const DEFAULT_LIFF_ID = '2011710455-EuzadfEo';
export const LIFF_ID = String(import.meta.env.VITE_LIFF_ID || DEFAULT_LIFF_ID).trim();

/** Must match the Endpoint URL configured for the LIFF app in LINE Developers Console */
export const LIFF_ENDPOINT = 'https://waterwatch-frontend-mu.vercel.app';

let isInitialized = false;
let initError: any = null;

/**
 * Initialize LIFF
 */
export async function initLiff(): Promise<boolean> {
  if (isInitialized) return true;

  if (!LIFF_ID) {
    initError = new Error('missing LIFF ID');
    return false;
  }

  try {
    await liff.init({ liffId: LIFF_ID });
    isInitialized = true;
    initError = null;
    console.log('[LIFF Service] Initialized successfully. InClient:', liff.isInClient());
    return true;
  } catch (err: any) {
    initError = err;
    console.error('[LIFF Service] Initialization error:', err?.message || err);
    return false;
  }
}

/**
 * Get profile of current user in LIFF
 */
export async function getLiffProfile(): Promise<LiffUserProfile | null> {
  const ready = await initLiff();
  if (!ready) return null;

  try {
    if (!liff.isLoggedIn() && !liff.isInClient()) {
      return null;
    }
    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
  } catch (err: any) {
    console.warn('[LIFF Service] Could not fetch profile:', err?.message);
    return null;
  }
}

/**
 * Close LIFF window if open in LINE client
 */
export function closeLiffWindow(): void {
  try {
    if (liff.isInClient()) {
      liff.closeWindow();
    } else {
      window.close();
    }
  } catch {
    try {
      window.close();
    } catch {}
  }
}

/**
 * Check if running inside LINE app
 */
export function isInLineClient(): boolean {
  try {
    return liff.isInClient();
  } catch {
    return false;
  }
}

/**
 * Build a LIFF deep link that opens the app inside LINE
 * (falls back to LINE web login automatically if the LINE app is not installed)
 */
export function getLiffDeepLink(path = '/dashboard'): string {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `https://liff.line.me/${LIFF_ID}${safePath}`;
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function friendlyInitError(err: any): string {
  const msg = String(err?.message || err || '');
  const lower = msg.toLowerCase();
  if (lower.includes('url') || lower.includes('endpoint') || lower.includes('redirect')) {
    return `URL ของหน้านี้ไม่ตรงกับ LIFF Endpoint (${LIFF_ENDPOINT}) กรุณาเปิดผ่านโดเมนหลัก`;
  }
  if (lower.includes('400') || lower.includes('channel') || lower.includes('developing')) {
    return 'LINE Channel ปฏิเสธการเชื่อมต่อ กรุณาตรวจสอบว่า Channel เป็น Published และ LIFF ID ถูกต้อง';
  }
  return `ไม่สามารถเชื่อมต่อ LINE ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง${msg ? ` (${msg})` : ''}`;
}

/**
 * Check if the current URL contains LINE/LIFF OAuth callback parameters
 */
export function hasLiffAuthParams(): boolean {
  if (typeof window === 'undefined') return false;
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  return search.includes('code=') || search.includes('liff.state=') || hash.includes('access_token=');
}

/**
 * Logout from LINE LIFF session if logged in
 */
export function logoutLiff(): void {
  try {
    if (liff.isLoggedIn()) {
      liff.logout();
    }
  } catch (err) {
    console.warn('[LIFF Service] Logout error:', err);
  }
}

/**
 * Login with LINE
 * - Mobile, or any origin other than the LIFF endpoint (localhost / preview) → open via liff.line.me
 * - Desktop on the LIFF endpoint → liff.login() (LINE web login with QR / email)
 */
export async function loginWithLiff(path = '/dashboard'): Promise<void> {
  const safePath = path.startsWith('/') ? path : `/${path}`;

  // Clear any existing guest session so it doesn't mask the incoming login
  try {
    const saved = localStorage.getItem('wl_auth_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.id === 'citizen_guest') {
        localStorage.removeItem('wl_auth_user');
      }
    }
  } catch {}

  if (isMobileDevice() || window.location.origin !== LIFF_ENDPOINT) {
    window.location.href = getLiffDeepLink(safePath);
    return;
  }

  const ready = await initLiff();
  if (!ready) {
    throw new Error(friendlyInitError(initError));
  }

  const targetUri = `${LIFF_ENDPOINT}${safePath}`;
  if (liff.isLoggedIn()) {
    window.location.href = targetUri;
    return;
  }

  liff.login({ redirectUri: targetUri });
}

export default liff;
