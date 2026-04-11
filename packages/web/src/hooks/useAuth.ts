import { useCallback, useState } from "react";

import { AUTH_LOGOUT_API_PATH, AUTH_REGISTER_API_PATH } from "../contracts";
import { httpClient } from "../utils";

const AUTH_TOKEN_KEY = "auth_token";

/**
 * Manages JWT auth state and all auth API touchpoints.
 * Token is read from localStorage on mount; register/login/logout
 * update both localStorage and React state.
 */
function useAuth() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY),
  );

  const login = useCallback((newToken: string): void => {
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  /** Registers a new user and stores the returned token. */
  const register = useCallback(
    async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name: string;
    }): Promise<void> => {
      const { token: newToken } = await httpClient.post<{
        user: { id: string };
        token: string;
      }>(AUTH_REGISTER_API_PATH, {
        body: { email, password, name },
      });
      login(newToken);
    },
    [login],
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

  return { token, register, login, logout };
}

export { useAuth };
