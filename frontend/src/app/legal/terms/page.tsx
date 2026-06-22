import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — SpinEarn",
  description: "The terms governing your use of the SpinEarn platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl">
        <nav aria-label="Main navigation" className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold hover:text-blue-300 transition-colors">
            <span aria-hidden="true">⚡</span> SpinEarn
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/legal/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-8 sm:mb-10">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-slate-400">Last updated: June 17, 2026</p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300">

          <section aria-labelledby="acceptance-heading">
            <h2 id="acceptance-heading" className="text-xl font-semibold text-white mb-3">1. Acceptance</h2>
            <p className="leading-relaxed">
              By installing the SpinEarn VS Code extension, creating an account, or using any SpinEarn
              service (&ldquo;Services&rdquo;), you agree to these Terms of Service (&ldquo;Terms&rdquo;).
              If you do not agree, do not use the Services. These Terms apply to both developers
              (who earn revenue) and advertisers (who purchase impressions).
            </p>
          </section>

          <section aria-labelledby="eligibility-heading">
            <h2 id="eligibility-heading" className="text-xl font-semibold text-white mb-3">2. Eligibility</h2>
            <p className="leading-relaxed">
              You must be at least 18 years old and legally permitted to enter into contracts in your
              jurisdiction to use the Services. By accepting these Terms, you represent that you meet
              these requirements. Payouts require a valid Razorpay account and may be subject
              to identity verification by Razorpay.
            </p>
          </section>

          <section aria-labelledby="developer-heading">
            <h2 id="developer-heading" className="text-xl font-semibold text-white mb-3">3. Developer terms</h2>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">Earning revenue</h3>
            <p className="leading-relaxed text-slate-400">
              Developers earn 50% of the CPM (cost per mille) bid by the winning advertiser for impressions
              confirmed on their machine. Clicks are additionally credited per the rates defined in our
              Pricing page. Earnings are subject to hourly and daily caps to prevent abuse.
            </p>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">Prohibited conduct</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>Generating artificial impressions or clicks through automation, scripts, or emulators</li>
              <li>Sharing account credentials or using the extension on machines you do not personally operate</li>
              <li>Circumventing hourly/daily earning caps through any means</li>
              <li>Reverse engineering or modifying the extension to alter impression reporting</li>
            </ul>
            <p className="leading-relaxed mt-3 text-slate-400">
              Violations result in immediate account termination and forfeiture of pending balance.
            </p>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">Payouts</h3>
            <p className="leading-relaxed text-slate-400">
              Payouts are processed via Razorpay. The minimum payout threshold is $10.00 USD.
              We reserve up to 14 days to process payout requests. Razorpay may require identity
              verification before releasing funds. Tax obligations are your responsibility.
            </p>
          </section>

          <section aria-labelledby="advertiser-heading">
            <h2 id="advertiser-heading" className="text-xl font-semibold text-white mb-3">4. Advertiser terms</h2>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">Campaign content</h3>
            <p className="leading-relaxed text-slate-400">
              You are solely responsible for the ad copy and destination URL in your campaigns.
              Ad copy must comply with all applicable laws and may not contain:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-2">
              <li>Misleading, defamatory, or fraudulent claims</li>
              <li>Adult content, gambling, illegal products, or malware distribution</li>
              <li>Phishing URLs or links to malicious resources</li>
              <li>Competitor trademark violations</li>
            </ul>
            <p className="leading-relaxed mt-3 text-slate-400">
              We reserve the right to reject or remove any campaign that violates these standards
              without refund.
            </p>
            <h3 className="text-base font-semibold text-slate-200 mb-2 mt-4">Payments and refunds</h3>
            <p className="leading-relaxed text-slate-400">
              Campaign budgets are paid in advance via Razorpay Checkout. Unspent budget from a cancelled
              campaign may be refunded at our discretion, less any impressions already served and
              payment processing fees. Chargebacks initiated by advertisers will result in account
              suspension.
            </p>
          </section>

          <section aria-labelledby="auction-heading">
            <h2 id="auction-heading" className="text-xl font-semibold text-white mb-3">5. Auction mechanics</h2>
            <p className="leading-relaxed">
              SpinEarn operates a real-time English-ascending auction. The highest active CPM bid at the
              moment of each impression wins. Bids can be increased at any time but cannot be decreased
              below the amount already spent. SpinEarn does not guarantee any minimum number of impressions
              — delivery depends on the competitive auction environment and developer install base.
            </p>
          </section>

          <section aria-labelledby="ip-heading">
            <h2 id="ip-heading" className="text-xl font-semibold text-white mb-3">6. Intellectual property</h2>
            <p className="leading-relaxed">
              SpinEarn retains all intellectual property rights in the extension, platform, and Services.
              You grant SpinEarn a limited, royalty-free license to display your ad creative to developers
              as part of normal campaign delivery. You represent that you own or have rights to all
              content you submit as ad copy.
            </p>
          </section>

          <section aria-labelledby="disclaimer-heading">
            <h2 id="disclaimer-heading" className="text-xl font-semibold text-white mb-3">7. Disclaimers &amp; limitation of liability</h2>
            <p className="leading-relaxed">
              The Services are provided &ldquo;as is&rdquo; without warranty of any kind. SpinEarn does not
              guarantee specific earnings or impression volumes. To the maximum extent permitted by law,
              SpinEarn&apos; total liability to you for any claim arising from these Terms shall not exceed
              the greater of (a) $100 USD or (b) the total fees paid by you to SpinEarn in the 3 months
              preceding the claim.
            </p>
          </section>

          <section aria-labelledby="termination-heading">
            <h2 id="termination-heading" className="text-xl font-semibold text-white mb-3">8. Termination</h2>
            <p className="leading-relaxed">
              Either party may terminate the agreement at any time. You may close your account from
              your dashboard settings. SpinEarn may suspend or terminate accounts that violate these
              Terms without notice. Upon termination, any earned balance above the $10.00 minimum
              threshold will be paid out within 30 days; balances below the threshold are forfeited.
            </p>
          </section>

          <section aria-labelledby="changes-heading">
            <h2 id="changes-heading" className="text-xl font-semibold text-white mb-3">9. Changes to these Terms</h2>
            <p className="leading-relaxed">
              We may update these Terms at any time. We will notify you by email and by posting a notice
              in the dashboard at least 14 days before material changes take effect. Continued use of
              the Services after the effective date constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section aria-labelledby="governing-heading">
            <h2 id="governing-heading" className="text-xl font-semibold text-white mb-3">10. Governing law</h2>
            <p className="leading-relaxed">
              These Terms are governed by the laws of India, without regard to conflict-of-law
              principles. Any disputes shall be resolved by arbitration under the Arbitration and
              Conciliation Act, 1996, with proceedings conducted in Pune, Maharashtra, India.
              Courts in Pune shall have exclusive jurisdiction for any matter not subject to arbitration.
            </p>
          </section>

          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="text-xl font-semibold text-white mb-3">11. Contact</h2>
            <p className="leading-relaxed">
              For questions about these Terms, email{" "}
              <a href="mailto:legal@spinearn.com" className="text-blue-400 hover:text-blue-300 underline">
                legal@spinearn.com
              </a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row gap-4 items-start">
          <Link
            href="/legal/privacy"
            className="text-sm text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
          >
            Privacy Policy →
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
