export function setAuthSession(payload: {
  accessToken: string;
  refreshToken: string;
  role: 'admin' | 'user';
}) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_present', 'true');
    localStorage.setItem('user_role', payload.role);
  }
}

export function updateStoredRole(role: 'admin' | 'user') {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_role', role);
  }
}

export function clearAuthSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_present');
    localStorage.removeItem('user_role');
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
