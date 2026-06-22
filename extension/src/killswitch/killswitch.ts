import { ApiClient } from "../api/client";

export interface RemoteConfig {
  global_kill_switch: boolean;
  poll_interval_ms: number;
  min_impression_duration_ms: number;
  earning_caps: {
    hourly_max_cents: number;
    daily_max_cents: number;
  };
  supported_surfaces: string[];
}

const DEFAULT_CONFIG: RemoteConfig = {
  global_kill_switch: false,
  poll_interval_ms: 60000,
  min_impression_duration_ms: 5000,
  earning_caps: { hourly_max_cents: 50, daily_max_cents: 500 },
  supported_surfaces: ["claude_code_webview", "codex_webview", "cli"],
};

export class KillSwitch {
  private _config: RemoteConfig = DEFAULT_CONFIG;
  private _pollTimer: NodeJS.Timeout | undefined;
  private _onKill: (() => void) | undefined;
  private _onRevive: (() => void) | undefined;
  private _wasKilled = false;

  constructor(private readonly apiClient: ApiClient) {}

  async initialize(): Promise<RemoteConfig> {
    const config = await this._fetchConfig();
    this._config = config;
    return config;
  }

  start(onKill: () => void, onRevive: () => void): void {
    this._onKill = onKill;
    this._onRevive = onRevive;
    this._schedulePoll();
  }

  getConfig(): RemoteConfig {
    return this._config;
  }

  isKilled(): boolean {
    return this._config.global_kill_switch;
  }

  private _schedulePoll(): void {
    const interval = this._config.poll_interval_ms;
    this._pollTimer = setInterval(async () => {
      try {
        const config = await this._fetchConfig();
        const wasKilled = this._config.global_kill_switch;
        this._config = config;

        if (!wasKilled && config.global_kill_switch) {
          this._wasKilled = true;
          this._onKill?.();
          console.log("SpinAds: disabled by remote config");
        } else if (wasKilled && !config.global_kill_switch && this._wasKilled) {
          this._wasKilled = false;
          this._onRevive?.();
          console.log("SpinAds: re-enabled by remote config");
        }
      } catch {
        // Fail open — if we can't reach the server, continue operating
      }
    }, interval);
  }

  private async _fetchConfig(): Promise<RemoteConfig> {
    try {
      return await this.apiClient.get<RemoteConfig>("/api/v1/config");
    } catch {
      return this._config;
    }
  }

  dispose(): void {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = undefined;
    }
  }
}
