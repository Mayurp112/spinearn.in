import * as vscode from "vscode";
import { ApiClient } from "../api/client";

interface BalanceResponse {
  pending_balance: string;
  paid_balance: string;
  today_earned: string;
  hourly_cap_cents: number;
  daily_cap_cents: number;
}

export class StatusBarManager implements vscode.Disposable {
  private readonly _item: vscode.StatusBarItem;
  private _pollTimer: NodeJS.Timeout | undefined;
  private _isSignedIn = false;
  private _currentBalance: BalanceResponse | undefined;

  constructor(
    private readonly apiClient: ApiClient,
    private readonly getToken: () => string | undefined,
  ) {
    const showInStatusBar = vscode.workspace
      .getConfiguration("spinads")
      .get<boolean>("showInStatusBar", true);

    this._item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this._item.command = "spinads.showStatus";

    if (showInStatusBar) {
      this._item.show();
    }

    this._renderSignedOut();
  }

  setSignedIn(isSignedIn: boolean): void {
    this._isSignedIn = isSignedIn;
    if (isSignedIn) {
      this._startPolling();
    } else {
      this._stopPolling();
      this._renderSignedOut();
    }
  }

  updateBalance(balance: BalanceResponse): void {
    this._currentBalance = balance;
    this._renderBalance(balance);
  }

  hide(): void {
    this._item.hide();
  }

  show(): void {
    this._item.show();
  }

  private _renderSignedOut(): void {
    this._item.text = "$(zap) SpinAds: Sign in";
    this._item.tooltip = "Click to sign in to SpinAds and start earning";
    this._item.command = "spinads.signIn";
    this._item.backgroundColor = undefined;
  }

  private _renderBalance(balance: BalanceResponse): void {
    const todayUSD = parseFloat(balance.today_earned);
    const totalUSD = parseFloat(balance.pending_balance);
    const dailyCapUSD = balance.daily_cap_cents / 100;
    const isCapHit = todayUSD >= dailyCapUSD;

    if (isCapHit) {
      const now = new Date();
      const msUntilReset =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        ).getTime() - now.getTime();
      const minsUntilReset = Math.round(msUntilReset / 60000);

      this._item.text = `$(zap) Cap reached (resets in ${minsUntilReset}m)`;
      this._item.tooltip = "Daily earning cap reached. Resets at midnight UTC.";
      this._item.command = "spinads.showStatus";
    } else {
      this._item.text = `$(zap) $${todayUSD.toFixed(2)} today · $${totalUSD.toFixed(2)} total`;
      this._item.tooltip = `SpinAds Earnings\nToday: $${todayUSD.toFixed(4)}\nTotal available: $${totalUSD.toFixed(4)}`;
      this._item.command = "spinads.showDashboard";
    }

    this._item.backgroundColor = undefined;
  }

  private _startPolling(): void {
    this._stopPolling();
    void this._fetchBalance();
    this._pollTimer = setInterval(() => void this._fetchBalance(), 60_000);
  }

  private _stopPolling(): void {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = undefined;
    }
  }

  private async _fetchBalance(): Promise<void> {
    const token = this.getToken();
    if (!token) return;

    try {
      const balance = await this.apiClient.get<BalanceResponse>("/api/v1/developers/me/balance");
      this._currentBalance = balance;
      this._renderBalance(balance);
    } catch {
      // Silently fail — status bar update is best-effort
    }
  }

  dispose(): void {
    this._stopPolling();
    this._item.dispose();
  }
}
