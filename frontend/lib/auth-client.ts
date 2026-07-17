export interface AuthUser {
  email: string;
}

export class AuthError extends Error {}

async function postCredentials(path: string, email: string, password: string): Promise<AuthUser> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AuthError(body?.detail ?? `Request failed (status ${response.status})`);
  }
  return response.json();
}

export function signUp(email: string, password: string): Promise<AuthUser> {
  return postCredentials("/api/auth/signup", email, password);
}

export function signIn(email: string, password: string): Promise<AuthUser> {
  return postCredentials("/api/auth/signin", email, password);
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
}
