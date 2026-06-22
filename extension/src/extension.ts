import * as vscode from "vscode";
import { AdRotationManager } from "./activation/adRotation";
import { SelfUpdateChecker } from "./activation/selfUpdate";
import { StatusBarManager } from "./activation/statusBar";
import { ClaudeCodeAdapter } from "./adapters/claudeCode";
import { CliAdapter } from "./adapters/cli";
import { CodexAdapter } from "./adapters/codex";
import { ApiClient } from "./api/client";
import { AuthManager } from "./auth/googleAuth";
import { KeychainVault } from "./auth/keychainVault";
import { ClickTracker } from "./metrics/clickTracker";
import { KillSwitch } from "./killswitch/killswitch";

const DISPOSABLES: vscode.Disposable[] = [];
let _initialized = false;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const enabled = vscode.workspace.getConfiguration("spinads").get<boolean>("enabled", true);
  if (!enabled) return;

  // ── Core services ───────────────────────────────────────────────────────
  const apiClient = new ApiClient(context);
  const vault = new KeychainVault(context);

  // ── Auth ────────────────────────────────────────────────────────────────
  const statusBar = new StatusBarManager(apiClient, () => authManager.getToken());
  DISPOSABLES.push(statusBar);

  const authManager = new AuthManager(vault, apiClient, (token) => {
    apiClient.setTokenProvider(() => token);
    statusBar.setSignedIn(token !== undefined);
  });

  await authManager.initialize();

  // ── Kill switch ─────────────────────────────────────────────────────────
  const killSwitch = new KillSwitch(apiClient);
  let remoteConfig;
  try {
    remoteConfig = await killSwitch.initialize();
  } catch {
    // Use defaults if config fetch fails
    remoteConfig = { global_kill_switch: false, poll_interval_ms: 60000 };
  }

  if (remoteConfig.global_kill_switch) {
    statusBar.hide();
    return;
  }

  killSwitch.start(
    () => {
      statusBar.hide();
      deactivateAdapters();
    },
    () => {
      statusBar.show();
      void initAdapters();
    },
  );
  DISPOSABLES.push(killSwitch);

  // ── Ad rotation + click tracking ────────────────────────────────────────
  const adRotation = new AdRotationManager(apiClient);
  const clickTracker = new ClickTracker(apiClient);

  // ── Adapters ────────────────────────────────────────────────────────────
  let claudeAdapter: ClaudeCodeAdapter | undefined;
  let codexAdapter: CodexAdapter | undefined;
  let cliAdapter: CliAdapter | undefined;

  const onBalanceUpdate = () => statusBar["_fetchBalance"]?.();

  function initAdapters() {
    claudeAdapter = new ClaudeCodeAdapter(apiClient, adRotation, clickTracker, onBalanceUpdate);
    codexAdapter = new CodexAdapter(apiClient, adRotation, clickTracker, onBalanceUpdate);
    cliAdapter = new CliAdapter(apiClient, adRotation, clickTracker, onBalanceUpdate);
    _initialized = true;
  }

  function deactivateAdapters() {
    claudeAdapter?.dispose();
    codexAdapter?.dispose();
    cliAdapter?.dispose();
    claudeAdapter = undefined;
    codexAdapter = undefined;
    cliAdapter = undefined;
    _initialized = false;
  }

  initAdapters();

  // ── Commands ────────────────────────────────────────────────────────────
  const signInCmd = vscode.commands.registerCommand("spinads.signIn", async () => {
    const success = await authManager.signIn();
    if (success) {
      vscode.window.showInformationMessage("SpinAds: Signed in! You're now earning from AI spinner ads.");
    }
  });

  const signOutCmd = vscode.commands.registerCommand("spinads.signOut", async () => {
    await authManager.signOut();
    vscode.window.showInformationMessage("SpinAds: Signed out.");
  });

  const showDashboardCmd = vscode.commands.registerCommand("spinads.showDashboard", () => {
    const apiUrl = vscode.workspace.getConfiguration("spinads").get<string>("apiUrl", "https://api.spinads.dev");
    const dashboardUrl = apiUrl.replace("api.", "").replace("8000", "3000") + "/dashboard";
    void vscode.env.openExternal(vscode.Uri.parse(dashboardUrl));
  });

  const showStatusCmd = vscode.commands.registerCommand("spinads.showStatus", async () => {
    const token = authManager.getToken();
    if (!token) {
      const action = await vscode.window.showInformationMessage(
        "SpinAds: Sign in to start earning from AI spinner ads.",
        "Sign In",
      );
      if (action === "Sign In") {
        await vscode.commands.executeCommand("spinads.signIn");
      }
      return;
    }

    try {
      const balance = await apiClient.get<{
        pending_balance: string;
        paid_balance: string;
        today_earned: string;
      }>("/api/v1/developers/me/balance");

      const msg = [
        `Today: $${parseFloat(balance.today_earned).toFixed(4)}`,
        `Available: $${parseFloat(balance.pending_balance).toFixed(4)}`,
        `Paid out: $${parseFloat(balance.paid_balance).toFixed(2)}`,
      ].join(" · ");

      const action = await vscode.window.showInformationMessage(
        `SpinAds Earnings — ${msg}`,
        "Open Dashboard",
      );
      if (action === "Open Dashboard") {
        await vscode.commands.executeCommand("spinads.showDashboard");
      }
    } catch {
      vscode.window.showErrorMessage("SpinAds: Failed to fetch balance. Check your connection.");
    }
  });

  DISPOSABLES.push(signInCmd, signOutCmd, showDashboardCmd, showStatusCmd);

  // ── Context subscriptions ────────────────────────────────────────────────
  context.subscriptions.push(...DISPOSABLES);
  context.subscriptions.push({
    dispose: () => {
      deactivateAdapters();
      authManager.dispose();
    },
  });

  // ── Self-update check (once on activation) ───────────────────────────────
  void SelfUpdateChecker.check();
}

export function deactivate(): void {
  for (const d of DISPOSABLES) {
    try {
      d.dispose();
    } catch {
      // Best-effort cleanup
    }
  }
  DISPOSABLES.length = 0;
}
