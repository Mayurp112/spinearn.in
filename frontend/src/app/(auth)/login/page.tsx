"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "";
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000";

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const BORDER = "rgba(255,255,255,0.08)";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const refCode = searchParams.get("ref") ?? "";

  const handleGitHubSignIn = () => {
    const redirectUri = `${FRONTEND_URL}/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "user:email",
      state: JSON.stringify({ callbackUrl, refCode }),
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-5"
      style={{ background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(37,99,235,0.1), #0a0a0a 60%)" }}
    >
      <a
        href="#login-form"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-blue-600 focus:text-white focus:text-sm focus:font-semibold"
      >
        Skip to login form
      </a>

      <div className="w-full max-w-[22rem]">
        {/* Logo */}
        <div className="text-center mb-9">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-7 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:bg-blue-500 transition-colors">
              <span className="text-sm font-black text-white leading-none">S</span>
            </div>
            <span className="text-[17px] font-bold tracking-[-0.03em] text-white">SpinEarn</span>
          </Link>
          <h1 className="text-[1.625rem] font-bold tracking-[-0.03em] text-white leading-tight mb-2">
            Welcome back
          </h1>
          <p className="text-[14px] text-white/45 font-[450]">Sign in to access your dashboard</p>
        </div>

        {/* Card */}
        <div
          id="login-form"
          className="rounded-2xl p-6 space-y-2.5 border"
          style={{ background: "#111111", borderColor: BORDER }}
        >
          {/* GitHub */}
          <button
            onClick={handleGitHubSignIn}
            className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl text-[14px] font-semibold text-white transition-all duration-150 border hover:bg-white/[0.07] hover:border-white/[0.15] active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: BORDER }}
            aria-label="Sign in with GitHub"
          >
            <GitHubIcon />
            Continue with GitHub
          </button>

          {/* Google */}
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl text-[14px] font-semibold bg-white text-[#0a0a0a] hover:bg-white/90 transition-all duration-150 active:scale-[0.98] shadow-sm"
            aria-label="Sign in with Google"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1" style={{ background: BORDER }} />
            <span className="text-[12px] text-white/25 font-medium">or</span>
            <div className="h-px flex-1" style={{ background: BORDER }} />
          </div>

          {/* Advertiser link */}
          <Link
            href="/advertise"
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-[14px] font-semibold text-white/48 hover:text-white transition-all duration-150 border hover:bg-white/[0.04]"
            style={{ borderColor: BORDER }}
          >
            I&apos;m an advertiser →
          </Link>
        </div>

        <p className="mt-5 text-[12px] text-white/25 text-center leading-relaxed px-2">
          By signing in, you agree to our{" "}
          <Link href="/legal/terms" className="text-white/45 hover:text-white/70 underline underline-offset-2 transition-colors">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="text-white/45 hover:text-white/70 underline underline-offset-2 transition-colors">
            Privacy Policy
          </Link>. SpinEarn never reads your code.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <LoginContent />
    </Suspense>
  );
}
