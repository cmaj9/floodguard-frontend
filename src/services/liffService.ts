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

let isInitialized = false;
let initError: any = null;

/**
 * Initialize LIFF with environment variable VITE_LIFF_ID
 */
export async function initLiff(): Promise<boolean> {
  if (isInitialized) return true;

  const liffId = import.meta.env.VITE_LIFF_ID || '';
  if (!liffId) {
    initError = new Error('ยังไม่ได้กำหนดค่า VITE_LIFF_ID ในระบบ');
    console.warn('[LIFF Service] VITE_LIFF_ID is not configured in .env yet.');
    return false;
  }

  try {
    await liff.init({ liffId });
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
  if (liff.isInClient()) {
    liff.closeWindow();
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
 * Login with LIFF (for external browsers or when user clicks login with LINE)
 */
export async function loginWithLiff(redirectUri?: string): Promise<void> {
  const liffId = import.meta.env.VITE_LIFF_ID || '';
  if (!liffId) {
    throw new Error('ไม่พบการตั้งค่า LINE LIFF ID ในระบบ');
  }

  const ready = await initLiff();
  if (!ready) {
    const errorStr = String(initError?.message || initError || '');
    if (
      errorStr.includes('400') ||
      errorStr.toLowerCase().includes('developing') ||
      errorStr.toLowerCase().includes('status')
    ) {
      throw new Error(
        'LINE Channel มีสถานะเป็น "Developing" ใน LINE Developers Console กรุณาเปลี่ยนสถานะเป็น "Published"'
      );
    }
    throw new Error(
      `ไม่สามารถเชื่อมต่อ LINE LIFF ได้ (${errorStr || 'กรุณาตรวจสอบว่า LINE Channel มีสถานะเป็น Published และรองรับ URL ปัจจุบัน'})`
    );
  }

  if (liff.isLoggedIn()) {
    window.location.href = redirectUri || '/dashboard';
    return;
  }

  liff.login({ redirectUri: redirectUri || window.location.href });
}

export default liff;
