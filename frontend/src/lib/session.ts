export function setAuthSession(payload: {
  accessToken: string;
  refreshToken: string;
  role: 'admin' | 'user';
}) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_present', 'true');
    localStorage.setItem('user_role', payload.role);
    
    // Set non-sensitive cookies for middleware visibility
    document.cookie = `auth_present=true; path=/; max-age=604800; SameSite=Lax; Secure`;
    document.cookie = `user_role=${payload.role}; path=/; max-age=604800; SameSite=Lax; Secure`;
    
    // We also set a helper cookie for the access token presence
    document.cookie = `access_token_present=true; path=/; max-age=604800; SameSite=Lax; Secure`;
  }
}

export function updateStoredRole(role: 'admin' | 'user') {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_role', role);
    document.cookie = `user_role=${role}; path=/; max-age=604800; SameSite=Lax; Secure`;
  }
}

export function clearAuthSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_present');
    localStorage.removeItem('user_role');
    
    // Clear cookies
    document.cookie = 'auth_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
    document.cookie = 'access_token_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
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
