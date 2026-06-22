import * as vscode from "vscode";
import type { AdRotationManager } from "../activation/adRotation";
import type { ClickTracker } from "../metrics/clickTracker";
import { ImpressionTracker } from "../metrics/impressionTracker";
import type { ApiClient } from "../api/client";

const CLAUDE_CLI_PROCESS_NAMES = ["claude", "claude-code"];
const THINKING_PATTERNS = [
  /thinking/i,
  /generating/i,
  /analyzing/i,
  /processing/i,
  /⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/,
];

export class CliAdapter implements vscode.Disposable {
  private readonly _statusBarItem: vscode.StatusBarItem;
  private readonly _disposables: vscode.Disposable[] = [];
  private _tracker: ImpressionTracker | undefined;
  private _currentAdText = "";
  private _isThinking = false;
  private _currentTerminal: vscode.Terminal | undefined;

  constructor(
    private readonly apiClient: ApiClient,
    private readonly adRotation: AdRotationManager,
    private readonly clickTracker: ClickTracker,
    private readonly onBalanceUpdate: () => void,
  ) {
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50,
    );
    this._statusBarItem.command = "spinads.adClick";

    this._watchTerminals();
  }

  private _watchTerminals(): void {
    const openDisposable = vscode.window.onDidOpenTerminal((terminal) => {
      this._checkTerminal(terminal);
    });

    const changeDisposable = vscode.window.onDidChangeActiveTerminal((terminal) => {
      if (terminal) this._checkTerminal(terminal);
    });

    this._disposables.push(openDisposable, changeDisposable);

    for (const terminal of vscode.window.terminals) {
      this._checkTerminal(terminal);
    }
  }

  private _checkTerminal(terminal: vscode.Terminal): void {
    const name = terminal.name.toLowerCase();
    const isClaudeCli = CLAUDE_CLI_PROCESS_NAMES.some((p) => name.includes(p));
    if (isClaudeCli) {
      this._currentTerminal = terminal;
      this._monitorTerminalOutput(terminal);
    }
  }

  private _monitorTerminalOutput(terminal: vscode.Terminal): void {
    const writeDisposable = (terminal as vscode.Terminal & {
      onDidWriteData?: (handler: (data: string) => void) => vscode.Disposable;
    }).onDidWriteData?.((data) => {
      void this._processTerminalData(data);
    });

    if (writeDisposable) {
      this._disposables.push(writeDisposable);
    }
  }

  private async _processTerminalData(data: string): Promise<void> {
    const isThinking = THINKING_PATTERNS.some((p) => p.test(data));

    if (isThinking && !this._isThinking) {
      this._isThinking = true;
      await this._onSpinnerStart();
    } else if (!isThinking && this._isThinking) {
      this._isThinking = false;
      this._onSpinnerStop();
    }
  }

  private async _onSpinnerStart(): Promise<void> {
    const ad = await this.adRotation.fetchCurrentAd();
    if (!ad) return;

    this._currentAdText = ad.creative_text;
    this._statusBarItem.text = `⚡ ${ad.creative_text}`;
    this._statusBarItem.tooltip = "Sponsored — click to visit";
    this._statusBarItem.show();

    this._tracker = new ImpressionTracker(this.apiClient, ad.campaign_id);
    this._tracker.start(ad.impression_id, "cli", () => {
      this.onBalanceUpdate();
    });

    const clickDisposable = vscode.commands.registerCommand(
      "spinads.adClick",
      () => {
        if (ad.impression_id && ad.click_url) {
          void this.clickTracker.openAdLink(ad.click_url, ad.impression_id);
        }
      },
    );
    this._disposables.push(clickDisposable);
  }

  private _onSpinnerStop(): void {
    this._tracker?.stop();
    this._tracker = undefined;
    this._statusBarItem.hide();
    this._currentAdText = "";
  }

  dispose(): void {
    this._tracker?.dispose();
    this._statusBarItem.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
  }
}
