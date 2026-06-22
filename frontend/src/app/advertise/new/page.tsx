"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuctionPosition } from "@/components/advertiser/AuctionPosition";
import RazorpayButton from "@/components/payment/RazorpayButton";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

const schema = z.object({
  creative_text: z.string().min(1, "Ad copy is required").max(80, "Max 80 characters"),
  destination_url: z.string().url("Must be a valid URL").startsWith("https://", { message: "Must start with https://" }),
  bid_cpm: z.number({ invalid_type_error: "Enter a valid amount" }).min(0.01, "Minimum $0.01").max(999.99, "Maximum $999.99"),
  impression_blocks: z.number({ invalid_type_error: "Enter a whole number" }).int().min(1, "Minimum 1 block").max(10000, "Maximum 10,000 blocks"),
});

type FormData = z.infer<typeof schema>;

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
      {children}
    </label>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
      <span aria-hidden="true">⚠</span> {message}
    </p>
  );
}

export default function NewCampaignPage() {
  const token = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const [razorpayCampaignId, setRazorpayCampaignId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { bid_cpm: 2.0, impression_blocks: 10 },
    mode: "onChange",
  });

  const watchedCPM = watch("bid_cpm") ?? 2.0;
  const watchedBlocks = watch("impression_blocks") ?? 10;
  const watchedText = watch("creative_text") ?? "";
  const totalCost = ((watchedCPM || 0) * (watchedBlocks || 0)).toFixed(2);
  const totalImpressions = (watchedBlocks || 0) * 1000;

  const auctionQuery = useQuery({
    queryKey: ["auction"],
    queryFn: () => api.campaigns.auction(token!),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  // Detect payment provider for this user
  const providerQuery = useQuery({
    queryKey: ["payout-provider"],
    queryFn: () => api.payoutProvider.get(token!),
    enabled: !!token,
  });
  const provider = providerQuery.data?.provider ?? "stripe";
  const isIndia = provider === "razorpay";

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      api.campaigns.create({ ...data, bid_cpm: String(data.bid_cpm) }, token!),
    onSuccess: (result) => {
      if (isIndia) {
        // Razorpay: keep on page, open checkout popup
        setRazorpayCampaignId(result.campaign_id);
      } else {
        // Stripe: redirect to hosted checkout
        window.location.href = result.checkout_url;
      }
    },
  });

  const winningBid = auctionQuery.data?.[0]?.bid_cpm ?? 0;
  const isWinning = watchedCPM > winningBid || auctionQuery.data?.length === 0;
  const isDisabled = isSubmitting || createMutation.isPending || !isValid;

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Create Campaign</h1>
        <p className="text-slate-500 text-sm">
          Your 1-line ad appears in AI coding tool spinners during &ldquo;thinking&rdquo; phases.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

        {/* Form — 3 cols */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-6" noValidate>

            {/* Creative text */}
            <fieldset className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <legend className="sr-only">Ad Creative</legend>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500" aria-hidden="true">Ad Creative</h2>

              <div>
                <Label htmlFor="creative_text">
                  Ad copy <span className="text-slate-700 normal-case tracking-normal font-normal">(max 80 chars)</span>
                </Label>
                <input
                  id="creative_text"
                  {...register("creative_text")}
                  placeholder="e.g. Try Warp Terminal — the AI-native terminal →"
                  maxLength={80}
                  required
                  aria-required="true"
                  aria-invalid={!!errors.creative_text}
                  aria-describedby={errors.creative_text ? "creative_text-error" : undefined}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all text-sm aria-[invalid=true]:border-red-500/60"
                />
                <div className="flex justify-between items-start mt-1.5 gap-2">
                  <FieldError id="creative_text-error" message={errors.creative_text?.message} />
                  <span
                    className={`text-xs ml-auto tabular-nums shrink-0 ${watchedText.length > 70 ? "text-amber-400" : "text-slate-600"}`}
                    aria-live="polite"
                    aria-label={`${watchedText.length} of 80 characters used`}
                  >
                    {watchedText.length}/80
                  </span>
                </div>
              </div>

              {/* Live preview */}
              <div className="rounded-xl bg-slate-950 border border-slate-800/60 p-4" aria-label="Ad preview in spinner">
                <h3 className="text-xs text-slate-600 mb-2 uppercase tracking-widest font-semibold" aria-hidden="true">Preview in spinner</h3>
                <div className="flex items-center gap-3" role="img" aria-label={`Spinner preview: ${watchedText || "Your ad text appears here"}`}>
                  <span className="text-blue-400 text-sm animate-spin" style={{ animationDuration: "2s" }} aria-hidden="true">⟳</span>
                  <span className="text-blue-300 font-mono text-sm truncate">
                    {watchedText || "Your ad text appears here →"}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="destination_url">
                  Destination URL <span className="text-slate-700 normal-case tracking-normal font-normal">(HTTPS only)</span>
                </Label>
                <input
                  id="destination_url"
                  {...register("destination_url")}
                  type="url"
                  placeholder="https://yourproduct.com?utm_source=spinads"
                  required
                  autoComplete="url"
                  aria-required="true"
                  aria-invalid={!!errors.destination_url}
                  aria-describedby={errors.destination_url ? "destination_url-error" : undefined}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all text-sm aria-[invalid=true]:border-red-500/60"
                />
                <FieldError id="destination_url-error" message={errors.destination_url?.message} />
              </div>
            </fieldset>

            {/* Bid & volume */}
            <fieldset className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <legend className="sr-only">Budget</legend>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500" aria-hidden="true">Budget</h2>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bid_cpm">Bid CPM (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" aria-hidden="true">$</span>
                    <input
                      id="bid_cpm"
                      {...register("bid_cpm", { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      aria-required="true"
                      aria-label="Bid CPM in US dollars"
                      aria-invalid={!!errors.bid_cpm}
                      aria-describedby={errors.bid_cpm ? "bid_cpm-error" : undefined}
                      className="w-full pl-7 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all text-sm aria-[invalid=true]:border-red-500/60"
                    />
                  </div>
                  <FieldError id="bid_cpm-error" message={errors.bid_cpm?.message} />
                  {winningBid > 0 && (
                    <p className={`text-xs mt-1.5 flex items-center gap-1 ${isWinning ? "text-emerald-400" : "text-amber-400"}`}>
                      {isWinning ? "✓ Your bid wins" : `↑ Bid $${(winningBid + 0.01).toFixed(2)}+ to win`}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="impression_blocks">
                    Impression blocks <span className="text-slate-700 normal-case tracking-normal font-normal">(×1,000)</span>
                  </Label>
                  <input
                    id="impression_blocks"
                    {...register("impression_blocks", { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="10000"
                    required
                    aria-required="true"
                    aria-label="Number of impression blocks, each block equals 1000 impressions"
                    aria-invalid={!!errors.impression_blocks}
                    aria-describedby={errors.impression_blocks ? "impression_blocks-error" : undefined}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all text-sm aria-[invalid=true]:border-red-500/60"
                  />
                  <FieldError id="impression_blocks-error" message={errors.impression_blocks?.message} />
                </div>
              </div>

              {/* Cost summary */}
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-2.5" aria-label="Cost breakdown">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total impressions</span>
                  <span className="text-white font-mono tabular-nums">{totalImpressions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Dev revenue share (50%)</span>
                  <span className="text-slate-400 font-mono tabular-nums">${(parseFloat(totalCost) / 2).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-800 pt-2.5 flex justify-between">
                  <span className="text-white font-semibold">Total cost</span>
                  <span className="text-2xl font-bold text-white font-mono tabular-nums">${totalCost}</span>
                </div>
                <p className="text-slate-600 text-xs">
                  {isIndia
                    ? "You'll pay via Razorpay — UPI, Net Banking, or Card accepted."
                    : "You'll be redirected to Stripe Checkout to complete payment."}
                </p>
              </div>
            </fieldset>

            {(createMutation.isError || payError) && (
              <div role="alert" className="rounded-xl bg-red-950/30 border border-red-500/20 p-3 text-red-400 text-sm">
                {payError ?? (createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Failed to create campaign. Please try again.")}
              </div>
            )}

            {/* Razorpay checkout — shown after campaign is created for Indian users */}
            {razorpayCampaignId ? (
              <div className="space-y-3">
                <p className="text-slate-400 text-sm text-center">Campaign created — complete payment to activate it.</p>
                <RazorpayButton
                  campaignId={razorpayCampaignId}
                  label={`Pay ₹${Math.round(parseFloat(totalCost) * 83)} with Razorpay`}
                  onSuccess={() => router.push(`/advertise/${razorpayCampaignId}`)}
                  onError={(msg) => setPayError(msg)}
                />
              </div>
            ) : (
              <button
                type="submit"
                disabled={isDisabled}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                aria-busy={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                    Creating campaign...
                  </span>
                ) : isIndia ? (
                  `Proceed to Razorpay — ₹${Math.round(parseFloat(totalCost) * 83)}`
                ) : (
                  `Proceed to Checkout — $${totalCost}`
                )}
              </button>
            )}
          </form>
        </div>

        {/* Sidebar — 2 cols */}
        <aside className="lg:col-span-2 space-y-6">
          {auctionQuery.data && (
            <AuctionPosition bids={auctionQuery.data} currentBid={watchedCPM} />
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">How it works</h2>
            <ol className="space-y-3">
              {[
                "Submit your 1-line ad copy and bid CPM",
                "Pay via Stripe Checkout — funds held securely",
                "SpinAds runs an English-ascending auction in real time",
                "Highest bidder's ad shows in developer spinners",
                "50% of your CPM goes directly to the developer",
              ].map((text, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0 mt-0.5" aria-hidden="true">
                    {i + 1}
                  </span>
                  <p className="text-slate-400 text-sm leading-snug">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </aside>

      </div>
    </div>
  );
}
