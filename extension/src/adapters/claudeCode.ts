import * as vscode from "vscode";
import type { AdRotationManager } from "../activation/adRotation";
import type { ClickTracker } from "../metrics/clickTracker";
import { ImpressionTracker } from "../metrics/impressionTracker";
import type { ApiClient } from "../api/client";

const CLAUDE_WEBVIEW_TITLES = ["Claude", "Claude Code", "claude"];

interface SpinnerState {
  isThinking: boolean;
  impressionId?: string;
  campaignId?: string;
}

export class ClaudeCodeAdapter implements vscode.Disposable {
  private readonly _disposables: vscode.Disposable[] = [];
  private readonly _panelTrackers = new Map<vscode.WebviewPanel, ImpressionTracker>();
  private _state: SpinnerState = { isThinking: false };

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
      "claude-code",
      {
        deserializeWebviewPanel: async (panel) => {
          this._attachToPanel(panel);
        },
      },
    );
    this._disposables.push(disposable);
  }

  private _attachToPanel(panel: vscode.WebviewPanel): void {
    if (!CLAUDE_WEBVIEW_TITLES.some((t) => panel.title.includes(t))) return;

    const tracker = new ImpressionTracker(
      this.apiClient,
      this._state.campaignId ?? "",
    );
    this._panelTrackers.set(panel, tracker);

    const msgDisposable = panel.webview.onDidReceiveMessage(
      async (message: { type: string; data?: unknown }) => {
        try {
          await this._handleWebviewMessage(panel, message, tracker);
        } catch {
          // Guard against any webview communication errors
        }
      },
    );

    const disposeDisposable = panel.onDidDispose(() => {
      tracker.dispose();
      this._panelTrackers.delete(panel);
      msgDisposable.dispose();
    });

    this._disposables.push(msgDisposable, disposeDisposable);
    this._injectObserverScript(panel);
  }

  private async _handleWebviewMessage(
    panel: vscode.WebviewPanel,
    message: { type: string; data?: unknown },
    tracker: ImpressionTracker,
  ): Promise<void> {
    switch (message.type) {
      case "SPINNER_START": {
        const ad = await this.adRotation.fetchCurrentAd();
        if (!ad) return;

        this._state = { isThinking: true, impressionId: ad.impression_id, campaignId: ad.campaign_id };

        panel.webview.postMessage({
          type: "INJECT_AD",
          creative_text: ad.creative_text,
          impression_id: ad.impression_id,
          click_url: ad.click_url,
        });

        tracker.start(ad.impression_id, "claude_code_webview", () => {
          this.onBalanceUpdate();
        });
        break;
      }

      case "SPINNER_STOP": {
        tracker.stop();
        this._state = { isThinking: false };
        break;
      }

      case "AD_CLICK": {
        const data = message.data as { impression_id: string; click_url: string } | undefined;
        if (data?.impression_id && data?.click_url) {
          void this.clickTracker.openAdLink(data.click_url, data.impression_id);
        }
        break;
      }
    }
  }

  private _injectObserverScript(panel: vscode.WebviewPanel): void {
    const script = `
      (function() {
        if (window.__spinadsInjected) return;
        window.__spinadsInjected = true;

        const vscode = acquireVsCodeApi();
        let spinnerVisible = false;
        let currentImpressionId = null;

        function detectSpinner(node) {
          if (!node || typeof node.textContent !== 'string') return false;
          const text = node.textContent.toLowerCase();
          return text.includes('thinking') || text.includes('loading') || text.includes('generating');
        }

        const observer = new MutationObserver(function(mutations) {
          for (const mutation of mutations) {
            const spinner = document.querySelector('[aria-label*="loading"], [aria-label*="thinking"], .spinner, .loading-indicator');
            const isVisible = !!spinner || document.querySelector('[data-testid="spinner"]');

            if (isVisible && !spinnerVisible) {
              spinnerVisible = true;
              vscode.postMessage({ type: 'SPINNER_START' });
            } else if (!isVisible && spinnerVisible) {
              spinnerVisible = false;
              if (currentImpressionId) {
                const adEl = document.getElementById('spinads-ad');
                if (adEl) adEl.remove();
                currentImpressionId = null;
              }
              vscode.postMessage({ type: 'SPINNER_STOP' });
            }
          }
        });

        observer.observe(document.body, { childList: true, subtree: true, attributes: true });

        window.addEventListener('message', function(event) {
          const msg = event.data;
          if (msg.type === 'INJECT_AD') {
            currentImpressionId = msg.impression_id;
            const existing = document.getElementById('spinads-ad');
            if (existing) existing.remove();

            const ad = document.createElement('div');
            ad.id = 'spinads-ad';
            ad.style.cssText = 'font-size:11px;color:#64748b;cursor:pointer;padding:2px 0;';
            ad.textContent = '⚡ ' + msg.creative_text;
            ad.setAttribute('aria-label', 'Sponsored message: ' + msg.creative_text);
            ad.addEventListener('click', function() {
              vscode.postMessage({ type: 'AD_CLICK', data: { impression_id: msg.impression_id, click_url: msg.click_url } });
            });

            const target = document.querySelector('.thinking-area, .spinner-container, [data-testid="spinner"]');
            if (target) {
              target.appendChild(ad);
            }
          }
        });
      })();
    `;

    panel.webview.postMessage({ type: "INJECT_OBSERVER", script });
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
