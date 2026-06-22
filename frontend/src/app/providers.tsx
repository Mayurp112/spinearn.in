"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/useAuthStore";

function AuthInitializer() {
  const initAuth = useAuthStore((s) => s.initAuth);
  useEffect(() => {
    initAuth();
  }, [initAuth]);
  return null;
}

export function Providers({ children }: { readonly children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
