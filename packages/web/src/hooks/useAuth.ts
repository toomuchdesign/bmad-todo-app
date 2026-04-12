import { useCallback, useState } from "react";

import {
  AUTH_LOGIN_API_PATH,
  AUTH_LOGOUT_API_PATH,
  AUTH_REGISTER_API_PATH,
} from "../contracts";
import { HttpError, httpClient } from "../utils";

const AUTH_TOKEN_KEY = "auth_token";

type AuthResult = { ok: true } | { ok: false; status?: number };

type LoginCredentials = { email: string; password: string };

type RegisterCredentials = { name: string; email: string; password: string };

type AuthResponse = { user: { id: string }; token: string };

/**
 * Manages JWT auth state and all auth API touchpoints.
 * Token is read from localStorage on mount; register/login/logout
 * update both localStorage and React state.
 */
function useAuth() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY),
  );

  const login = useCallback(
    async ({ email, password }: LoginCredentials): Promise<AuthResult> => {
      try {
        const { token: newToken } = await httpClient.post<AuthResponse>(
          AUTH_LOGIN_API_PATH,
          { body: { email, password } },
        );
        localStorage.setItem(AUTH_TOKEN_KEY, newToken);
        setToken(newToken);
        return { ok: true };
      } catch (caught) {
        if (caught instanceof HttpError) {
          return { ok: false, status: caught.status };
        }
        return { ok: false };
      }
    },
    [],
  );

  const register = useCallback(
    async ({
      name,
      email,
      password,
    }: RegisterCredentials): Promise<AuthResult> => {
      try {
        const { token: newToken } = await httpClient.post<AuthResponse>(
          AUTH_REGISTER_API_PATH,
          { body: { name, email, password } },
        );
        localStorage.setItem(AUTH_TOKEN_KEY, newToken);
        setToken(newToken);
        return { ok: true };
      } catch (caught) {
        if (caught instanceof HttpError) {
          return { ok: false, status: caught.status };
        }
        return { ok: false };
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    // Best-effort — clear client state regardless of server outcome
    try {
      await httpClient.post(AUTH_LOGOUT_API_PATH);
    } catch {
      // ignore
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
  }, []);

  return { token, login, register, logout };
}

export type { AuthResult, LoginCredentials, RegisterCredentials };
export { useAuth };
