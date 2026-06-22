"use client";

import { useState, useEffect } from "react";
import { api, type RazorpayVerifyPayment } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
  prefill?: { email?: string; name?: string };
}

interface RazorpayInstance {
  open(): void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface Props {
  campaignId: string;
  onSuccess: () => void;
  onError?: (msg: string) => void;
  label?: string;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayButton({ campaignId, onSuccess, onError, label = "Pay with Razorpay" }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    loadRazorpayScript().then(setScriptReady);
  }, []);

  const handlePay = async () => {
    if (!token || !scriptReady) return;
    setLoading(true);

    try {
      // Step 1: Create order on backend
      const order = await api.razorpay.createOrder(campaignId, token);

      // Step 2: Open Razorpay checkout popup
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.key_id,
          amount: order.amount_paise,
          currency: order.currency,
          order_id: order.order_id,
          name: "SpinEarn",
          description: "Campaign Activation",
          theme: { color: "#3b82f6" },
          handler: async (response: RazorpayResponse) => {
            // Step 3: Verify signature on backend
            try {
              const verifyData: RazorpayVerifyPayment = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                campaign_id: campaignId,
              };
              await api.razorpay.verifyPayment(verifyData, token);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
        });
        rzp.open();
      });

      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      if (msg !== "Payment cancelled") {
        onError?.(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading || !scriptReady}
      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Processing…
        </>
      ) : (
        <>
          <span>₹</span>
          {label}
        </>
      )}
    </button>
  );
}
