import * as vscode from "vscode";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private _baseUrl: string;
  private _deviceId: string;
  private _getToken: (() => string | undefined) | undefined;

  constructor(context: vscode.ExtensionContext) {
    this._baseUrl = vscode.workspace
      .getConfiguration("spinearn")
      .get<string>("apiUrl", "https://api.spinearn.in");

    this._deviceId = this._getOrCreateDeviceId(context);
  }

  setTokenProvider(getToken: () => string | undefined): void {
    this._getToken = getToken;
  }

  private _getOrCreateDeviceId(context: vscode.ExtensionContext): string {
    const existing = context.globalState.get<string>("spinearn.iniceId");
    if (existing) return existing;

    const newId = this._generateUuid();
    context.globalState.update("spinearn.iniceId", newId);
    return newId;
  }

  private _generateUuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  getDeviceId(): string {
    return this._deviceId;
  }

  private _buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Device-ID": this._deviceId,
      ...extra,
    };
    const token = this._getToken?.();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async get<T>(path: string, extra?: Record<string, string>): Promise<T> {
    return this._request<T>("GET", path, undefined, extra);
  }

  async post<T>(path: string, body: unknown, extra?: Record<string, string>): Promise<T> {
    return this._request<T>("POST", path, body, extra);
  }

  private async _request<T>(
    method: string,
    path: string,
    body?: unknown,
    extra?: Record<string, string>,
    retries = 2,
  ): Promise<T> {
    const url = `${this._baseUrl}${path}`;
    const headers = this._buildHeaders(extra);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        if (response.status === 204) {
          return undefined as T;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const message = (data as { detail?: string })?.detail ?? `HTTP ${response.status}`;
          if (response.status < 500) {
            throw new ApiError(response.status, message);
          }
          lastError = new ApiError(response.status, message);
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw lastError;
        }

        return data as T;
      } catch (err) {
        if (err instanceof ApiError && err.status < 500) throw err;
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("Request failed");
  }
}
