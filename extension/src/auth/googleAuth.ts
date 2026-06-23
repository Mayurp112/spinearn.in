import * as vscode from "vscode";
import { ApiClient } from "../api/client";
import { KeychainVault } from "./keychainVault";

const TOKEN_EXPIRE_BUFFER_MS = 60 * 1000;

interface TokenPayload {
  sub: string;
  exp: number;
  email: string;
}

function parseJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload) as TokenPayload;
  } catch {
    return null;
  }
}

export class AuthManager {
  private _accessToken: string | undefined;
  private _refreshTimer: NodeJS.Timeout | undefined;

  constructor(
    private readonly vault: KeychainVault,
    private readonly apiClient: ApiClient,
    private readonly onTokenChange: (token: string | undefined) => void,
  ) {}

  async initialize(): Promise<void> {
    const stored = await this.vault.getToken();
    if (stored && !this._isExpired(stored)) {
      this._accessToken = stored;
      this.onTokenChange(stored);
      this._scheduleRefresh(stored);
    }
  }

  async signIn(): Promise<boolean> {
    let session: vscode.AuthenticationSession;
    try {
      session = await vscode.authentication.getSession(
        "google",
        ["openid", "email", "profile"],
        { createIfNone: true },
      );
    } catch (err) {
      vscode.window.showErrorMessage(`SpinEarn: Sign-in failed — ${String(err)}`);
      return false;
    }

    try {
      const result = await this.apiClient.post<{
        access_token: string;
        developer_id: string;
        email: string;
      }>("/api/v1/auth/google", { id_token: session.accessToken });

      this._accessToken = result.access_token;
      await this.vault.storeToken(result.access_token);
      this.onTokenChange(result.access_token);
      this._scheduleRefresh(result.access_token);
      return true;
    } catch (err) {
      vscode.window.showErrorMessage(`SpinEarn: Authentication failed — ${String(err)}`);
      return false;
    }
  }

  async signOut(): Promise<void> {
    this._accessToken = undefined;
    await this.vault.deleteToken();
    this._clearRefreshTimer();
    this.onTokenChange(undefined);

    try {
      const sessions = await vscode.authentication.getSession("google", ["openid"], {
        createIfNone: false,
      });
      if (sessions) {
        await this.apiClient.post("/api/v1/auth/logout", {}).catch(() => undefined);
      }
    } catch {
      // Best-effort sign out
    }
  }

  getToken(): string | undefined {
    return this._accessToken;
  }

  getAuthHeaders(): Record<string, string> {
    if (this._accessToken) {
      return { Authorization: `Bearer ${this._accessToken}` };
    }
    return {};
  }

  private _isExpired(token: string): boolean {
    const payload = parseJwtPayload(token);
    if (!payload) return true;
    return Date.now() >= payload.exp * 1000 - TOKEN_EXPIRE_BUFFER_MS;
  }

  private _scheduleRefresh(token: string): void {
    this._clearRefreshTimer();
    const payload = parseJwtPayload(token);
    if (!payload) return;

    const msUntilExpiry = payload.exp * 1000 - Date.now() - TOKEN_EXPIRE_BUFFER_MS;
    if (msUntilExpiry <= 0) return;

    this._refreshTimer = setTimeout(async () => {
      try {
        const result = await this.apiClient.post<{ access_token: string }>(
          "/api/v1/auth/refresh",
          {},
        );
        this._accessToken = result.access_token;
        await this.vault.storeToken(result.access_token);
        this.onTokenChange(result.access_token);
        this._scheduleRefresh(result.access_token);
      } catch {
        // Refresh failed — user will need to sign in again
      }
    }, msUntilExpiry);
  }

  private _clearRefreshTimer(): void {
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = undefined;
    }
  }

  dispose(): void {
    this._clearRefreshTimer();
  }
}
