function getSecureSuffix() {
  if (typeof window === 'undefined') return '';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? '' : '; Secure';
}

export function setAuthSession(payload: {
  accessToken: string;
  refreshToken: string;
  role: 'admin' | 'user';
}) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_present', 'true');
    localStorage.setItem('user_role', payload.role);
    
    const secureSuffix = getSecureSuffix();

    document.cookie = `auth_present=true; path=/; max-age=604800; SameSite=Lax${secureSuffix}`;
    document.cookie = `user_role=${payload.role}; path=/; max-age=604800; SameSite=Lax${secureSuffix}`;
    document.cookie = `access_token_present=true; path=/; max-age=604800; SameSite=Lax${secureSuffix}`;
  }
}

export function updateStoredRole(role: 'admin' | 'user') {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_role', role);
    const secureSuffix = getSecureSuffix();
    document.cookie = `user_role=${role}; path=/; max-age=604800; SameSite=Lax${secureSuffix}`;
  }
}

export function clearAuthSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_present');
    localStorage.removeItem('user_role');
    
    const secureSuffix = getSecureSuffix();
    // Clear cookies
    document.cookie = `auth_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureSuffix}`;
    document.cookie = `user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureSuffix}`;
    document.cookie = `access_token_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureSuffix}`;
  }
}

export function getStoredAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_present') === 'true' ? 'http-only' : null;
  }
  return null;
}

export function getStoredRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_present') === 'true' ? 'http-only' : null;
  }
  return null;
}

export function getStoredRole(): 'admin' | 'user' | null {
  if (typeof window !== 'undefined') {
    const localValue = localStorage.getItem('user_role');
    if (localValue === 'admin' || localValue === 'user') {
      return localValue;
    }
  }
  return null;
}
