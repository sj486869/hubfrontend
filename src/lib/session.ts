const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setCookie(name: string, value: string, maxAge: number = COOKIE_MAX_AGE) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export function setAuthSession(payload: {
  accessToken: string;
  refreshToken: string;
  role: 'admin' | 'user';
}) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', payload.accessToken);
    localStorage.setItem('refresh_token', payload.refreshToken);
    localStorage.setItem('user_role', payload.role);
  }

  setCookie('access_token', payload.accessToken);
  setCookie('refresh_token', payload.refreshToken);
  setCookie('user_role', payload.role);
}

export function updateStoredRole(role: 'admin' | 'user') {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_role', role);
  }
  setCookie('user_role', role);
}

export function clearAuthSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
  }

  deleteCookie('access_token');
  deleteCookie('refresh_token');
  deleteCookie('user_role');
}

export function getStoredAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    const localValue = localStorage.getItem('access_token');
    if (localValue) return localValue;
  }
  return getCookie('access_token');
}

export function getStoredRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    const localValue = localStorage.getItem('refresh_token');
    if (localValue) return localValue;
  }
  return getCookie('refresh_token');
}

export function getStoredRole(): 'admin' | 'user' | null {
  if (typeof window !== 'undefined') {
    const localValue = localStorage.getItem('user_role');
    if (localValue === 'admin' || localValue === 'user') {
      return localValue;
    }
  }

  const cookieValue = getCookie('user_role');
  return cookieValue === 'admin' || cookieValue === 'user' ? cookieValue : null;
}
