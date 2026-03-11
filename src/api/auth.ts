export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'team_member' | null;
}

type AuthResponse = {
  user: AuthUser;
}

const API = 'https://api.veroindia.in/api/auth';

async function parseAuthResponse(res: Response): Promise<AuthResponse> {
  const text = await res.text();
  let data: AuthResponse | { error?: string } | null = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(('error' in (data ?? {}) ? data?.error : undefined) ?? text ?? 'Authentication request failed');
  }

  return data as AuthResponse;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await fetch(`${API}/me`, {
    credentials: 'include',
  });

  const data = await parseAuthResponse(res);
  return data.user;
}

export async function login(data: { email: string; password: string }): Promise<AuthUser> {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const response = await parseAuthResponse(res);
  return response.user;
}

export async function signup(data: { name: string; email: string; password: string }): Promise<AuthUser> {
  const res = await fetch(`${API}/signup`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const response = await parseAuthResponse(res);
  return response.user;
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API}/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export async function updateProfile(data: { name: string; email: string }): Promise<AuthUser> {
  const res = await fetch(`${API}/profile`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const response = await parseAuthResponse(res);
  return response.user;
}

export async function updatePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
  const res = await fetch(`${API}/account/password`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    let error = 'Failed to update password';
    try {
      const parsed = text ? JSON.parse(text) : null;
      error = parsed?.error ?? error;
    } catch {
      error = text || error;
    }
    throw new Error(error);
  }
}

export async function completeOnboarding(data: { role: 'admin' | 'team_member' }): Promise<AuthUser> {
  const res = await fetch(`${API}/onboarding`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const response = await parseAuthResponse(res);
  return response.user;
}
