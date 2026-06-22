import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-5">
      <main className="text-center max-w-md w-full" aria-labelledby="not-found-heading">
        <div
          className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-7 shadow-lg shadow-blue-500/25"
          aria-hidden="true"
        >
          <span className="text-xl font-black text-white">S</span>
        </div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-blue-400 mb-3">404 — Not Found</p>
        <h1
          id="not-found-heading"
          className="text-[2rem] sm:text-[2.5rem] font-bold tracking-[-0.04em] text-white mb-4 leading-[1.06]"
        >
          This page doesn&apos;t exist
        </h1>
        <p className="text-white/45 text-[15px] leading-relaxed mb-10">
          The link you followed may be broken, or the page may have been removed.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all font-semibold text-[14px] shadow-lg shadow-blue-500/20 hover:-translate-y-px"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl border text-[14px] font-semibold text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
            style={{ borderColor: "rgba(255,255,255,0.09)" }}
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
