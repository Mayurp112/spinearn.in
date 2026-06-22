import * as vscode from "vscode";
import { ApiClient } from "../api/client";

export type Surface = "claude_code_webview" | "codex_webview" | "cli";

export class ImpressionTracker {
  private _intervalId: NodeJS.Timeout | undefined;
  private _timerMs = 0;
  private _impressionId: string | undefined;
  private _surface: Surface | undefined;
  private _confirmed = false;
  private _onConfirmed: ((impressionId: string) => void) | undefined;

  private static readonly THRESHOLD_MS = 5000;
  private static readonly TICK_MS = 100;

  constructor(
    private readonly apiClient: ApiClient,
    private readonly campaignId: string,
  ) {}

  start(
    impressionId: string,
    surface: Surface,
    onConfirmed: (impressionId: string) => void,
  ): void {
    this.stop();
    this._impressionId = impressionId;
    this._surface = surface;
    this._confirmed = false;
    this._timerMs = 0;
    this._onConfirmed = onConfirmed;

    this._intervalId = setInterval(() => this._tick(), ImpressionTracker.TICK_MS);
  }

  stop(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = undefined;
    }
    this._timerMs = 0;
  }

  private _tick(): void {
    if (!vscode.window.state.focused) return;
    this._timerMs += ImpressionTracker.TICK_MS;

    if (!this._confirmed && this._timerMs >= ImpressionTracker.THRESHOLD_MS) {
      this._confirmed = true;
      void this._confirmImpression();
    }
  }

  private async _confirmImpression(): Promise<void> {
    if (!this._impressionId || !this._surface) return;

    const impressionId = this._impressionId;
    const surface = this._surface;

    try {
      await this.apiClient.post<{ credited: boolean; developer_earn?: number }>(
        "/api/v1/metrics/impression/confirm",
        {
          impression_id: impressionId,
          device_id: this.apiClient.getDeviceId(),
          campaign_id: this.campaignId,
          duration_ms: this._timerMs,
          surface,
        },
      );
      this._onConfirmed?.(impressionId);
    } catch {
      // Idempotent — if 409, do not retry
    }

    this.stop();
  }

  dispose(): void {
    this.stop();
  }
}
