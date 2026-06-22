"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000";

function GitHubCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const code = searchParams.get("code");
    const stateRaw = searchParams.get("state") ?? "{}";
    let callbackUrl = "/dashboard";
    let refCode = "";

    try {
      const state = JSON.parse(stateRaw);
      callbackUrl = state.callbackUrl ?? "/dashboard";
      refCode = state.refCode ?? "";
    } catch {}

    if (!code) {
      router.replace("/login?error=github_no_code");
      return;
    }

    const redirectUri = `${FRONTEND_URL}/auth/github/callback`;

    fetch(`${API_BASE}/api/v1/auth/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code, redirect_uri: redirectUri, ref_code: refCode || null }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? "GitHub auth failed");
        }
        return res.json();
      })
      .then((data) => {
        setAuth(data.access_token, data.developer_id, data.email);
        router.replace(callbackUrl);
      })
      .catch(() => {
        router.replace("/login?error=github_auth_failed");
      });
  }, [searchParams, router, setAuth]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Signing in with GitHub…</p>
      </div>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <GitHubCallbackContent />
    </Suspense>
  );
}
