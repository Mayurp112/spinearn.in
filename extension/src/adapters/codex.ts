import * as vscode from "vscode";
import type { AdRotationManager } from "../activation/adRotation";
import type { ClickTracker } from "../metrics/clickTracker";
import { ImpressionTracker } from "../metrics/impressionTracker";
import type { ApiClient } from "../api/client";

const COPILOT_WEBVIEW_IDS = ["github.copilot", "copilot-chat", "GitHub Copilot Chat"];

export class CodexAdapter implements vscode.Disposable {
  private readonly _disposables: vscode.Disposable[] = [];
  private readonly _panelTrackers = new Map<vscode.WebviewPanel, ImpressionTracker>();

  constructor(
    private readonly apiClient: ApiClient,
    private readonly adRotation: AdRotationManager,
    private readonly clickTracker: ClickTracker,
    private readonly onBalanceUpdate: () => void,
  ) {
    this._registerPanelListener();
  }

  private _registerPanelListener(): void {
    const disposable = vscode.window.registerWebviewPanelSerializer(
      "github.copilot.chat",
      {
        deserializeWebviewPanel: async (panel) => {
          this._attachToPanel(panel);
        },
      },
    );
    this._disposables.push(disposable);
  }

  private _attachToPanel(panel: vscode.WebviewPanel): void {
    const isCopilot = COPILOT_WEBVIEW_IDS.some(
      (id) => panel.viewType.includes(id) || panel.title.includes("Copilot"),
    );
    if (!isCopilot) return;

    const tracker = new ImpressionTracker(this.apiClient, "");
    this._panelTrackers.set(panel, tracker);

    const msgDisposable = panel.webview.onDidReceiveMessage(
      async (message: { type: string; data?: unknown }) => {
        try {
          await this._handleWebviewMessage(panel, message, tracker);
        } catch {
          // Guard against webview communication errors
        }
      },
    );

    const disposeDisposable = panel.onDidDispose(() => {
      tracker.dispose();
      this._panelTrackers.delete(panel);
      msgDisposable.dispose();
    });

    this._disposables.push(msgDisposable, disposeDisposable);
  }

  private async _handleWebviewMessage(
    panel: vscode.WebviewPanel,
    message: { type: string; data?: unknown },
    tracker: ImpressionTracker,
  ): Promise<void> {
    if (message.type === "SPINNER_START") {
      const ad = await this.adRotation.fetchCurrentAd();
      if (!ad) return;

      panel.webview.postMessage({
        type: "INJECT_AD",
        creative_text: ad.creative_text,
        impression_id: ad.impression_id,
        click_url: ad.click_url,
      });

      tracker.start(ad.impression_id, "codex_webview", () => {
        this.onBalanceUpdate();
      });
    } else if (message.type === "SPINNER_STOP") {
      tracker.stop();
    } else if (message.type === "AD_CLICK") {
      const data = message.data as { impression_id: string; click_url: string } | undefined;
      if (data?.impression_id && data?.click_url) {
        void this.clickTracker.openAdLink(data.click_url, data.impression_id);
      }
    }
  }

  dispose(): void {
    for (const tracker of this._panelTrackers.values()) {
      tracker.dispose();
    }
    this._panelTrackers.clear();
    for (const d of this._disposables) {
      d.dispose();
    }
  }
}
