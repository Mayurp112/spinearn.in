import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — SpinEarn",
  description: "How SpinEarn collects, uses, and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl">
        <nav aria-label="Main navigation" className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5 font-bold hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-[10px] bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-black text-white leading-none">S</span>
            </div>
            <span className="text-[14px] tracking-[-0.02em] text-white">SpinEarn</span>
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/legal/terms" className="text-slate-400 hover:text-white transition-colors">Terms</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-8 sm:mb-10">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-slate-400">Last updated: June 17, 2026</p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300">

          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="text-xl font-semibold text-white mb-3">Overview</h2>
            <p className="leading-relaxed">
              SpinEarn (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates a VS Code extension
              and web platform that allows developers to earn revenue from sponsored messages shown during
              AI spinner phases. This Privacy Policy explains what data we collect, how we use it, and
              your rights regarding that data.
            </p>
            <p className="leading-relaxed mt-3">
              We are committed to a core principle: <strong className="text-white">SpinEarn never reads
              your code, AI prompts, AI completions, or any content you work on.</strong> Our extension
              only detects when a spinner is active — not what the spinner contains.
            </p>
          </section>

          <section aria-labelledby="collect-heading">
            <h2 id="collect-heading" className="text-xl font-semibold text-white mb-3">What we collect</h2>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">Account information</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Name and email address (from GitHub or Google OAuth)</li>
              <li>GitHub username or Google account ID (OAuth identifier only — no password stored)</li>
              <li>Razorpay account identifiers (for payouts — we never store full card numbers)</li>
            </ul>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">Extension activity</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Timestamp and duration of spinner events (NOT the content of your prompts or completions)</li>
              <li>Whether an impression was shown and whether a click occurred</li>
              <li>VS Code extension version and platform (Windows/macOS/Linux)</li>
            </ul>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">Financial data</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Earnings balance, payout history, and referral bonus records</li>
              <li>Advertiser campaign budgets and spend — handled by Razorpay, not stored raw by us</li>
            </ul>
          </section>

          <section aria-labelledby="use-heading">
            <h2 id="use-heading" className="text-xl font-semibold text-white mb-3">How we use your data</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>To authenticate your account and maintain your session</li>
              <li>To calculate and credit your earnings from impressions and clicks</li>
              <li>To process payout requests via Razorpay</li>
              <li>To serve the highest-bidding advertiser&apos;s message in your spinner</li>
              <li>To detect fraud and enforce daily/hourly earning caps</li>
              <li>To send transactional emails (payout confirmations, security alerts)</li>
            </ul>
            <p className="leading-relaxed mt-4">
              We do not sell your personal data. We do not use your data for advertising targeting
              beyond serving the single winning auction ad to your spinner.
            </p>
          </section>

          <section aria-labelledby="share-heading">
            <h2 id="share-heading" className="text-xl font-semibold text-white mb-3">Who we share data with</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li><strong className="text-white">Razorpay</strong> — payment processing and developer payouts. Subject to <a href="https://razorpay.com/privacy/" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">Razorpay&apos;s Privacy Policy</a>.</li>
              <li><strong className="text-white">AWS</strong> — infrastructure hosting (US regions). Data is encrypted at rest and in transit.</li>
              <li><strong className="text-white">No analytics vendors</strong> — we do not use Google Analytics, Mixpanel, or similar third-party tracking tools.</li>
            </ul>
          </section>

          <section aria-labelledby="retention-heading">
            <h2 id="retention-heading" className="text-xl font-semibold text-white mb-3">Data retention</h2>
            <p className="leading-relaxed">
              Account data is retained for the lifetime of your account plus 90 days after deletion
              (for fraud prevention). Financial records (earnings, payouts) are retained for 7 years
              as required by applicable tax regulations. Impression logs older than 24 months are
              aggregated and stripped of individual identifiers.
            </p>
          </section>

          <section aria-labelledby="rights-heading">
            <h2 id="rights-heading" className="text-xl font-semibold text-white mb-3">Your rights</h2>
            <p className="leading-relaxed mb-3">You may at any time:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>Request a copy of all data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt out of non-transactional communications</li>
              <li>Disconnect your Razorpay account at any time</li>
            </ul>
            <p className="leading-relaxed mt-4">
              To exercise these rights, email{" "}
              <a href="mailto:privacy@spinearn.com" className="text-blue-400 hover:text-blue-300 underline">
                privacy@spinearn.com
              </a>.
              We will respond within 30 days.
            </p>
          </section>

          <section aria-labelledby="cookies-heading">
            <h2 id="cookies-heading" className="text-xl font-semibold text-white mb-3">Cookies &amp; tokens</h2>
            <p className="leading-relaxed">
              We use a single <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 text-sm">spinearn-refresh</code>{" "}
              httpOnly cookie to maintain your session. This cookie is strictly necessary for authentication
              and cannot be disabled while using the dashboard. We do not use third-party tracking cookies.
            </p>
          </section>

          <section aria-labelledby="security-heading">
            <h2 id="security-heading" className="text-xl font-semibold text-white mb-3">Security</h2>
            <p className="leading-relaxed">
              All data is transmitted over TLS 1.2+. Access tokens are held in memory only and never
              written to localStorage. Your database records are encrypted at rest using AES-256.
              Payout processing uses Razorpay&apos;s PCI-compliant infrastructure — we never handle raw
              card numbers.
            </p>
          </section>

          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p className="leading-relaxed">
              For privacy-related questions or requests, contact{" "}
              <a href="mailto:privacy@spinearn.com" className="text-blue-400 hover:text-blue-300 underline">
                privacy@spinearn.com
              </a>.
              For general support, use{" "}
              <a href="mailto:hello@spinearn.com" className="text-blue-400 hover:text-blue-300 underline">
                hello@spinearn.com
              </a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row gap-4 items-start">
          <Link
            href="/legal/terms"
            className="text-sm text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
          >
            Terms of Service →
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
