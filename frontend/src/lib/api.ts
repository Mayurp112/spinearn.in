const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.detail ?? `HTTP ${response.status}`,
      body,
    );
  }

  return body as T;
}

export function apiGet<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, { method: "GET", token });
}

export function apiPost<T>(path: string, data?: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: data !== undefined ? JSON.stringify(data) : undefined,
    token,
  });
}

export function apiPatch<T>(path: string, data?: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: data !== undefined ? JSON.stringify(data) : undefined,
    token,
  });
}

export function apiDelete(path: string, token?: string): Promise<void> {
  return request<void>(path, { method: "DELETE", token });
}

// ─── Typed endpoints ────────────────────────────────────────────────────────

export interface DeveloperBalance {
  pending_balance: string;
  paid_balance: string;
  today_earned: string;
  week_earned: string;
  hourly_cap_cents: number;
  daily_cap_cents: number;
}

export interface EarningsPoint {
  label: string;
  earned: number;
  impression_earned: number;
  click_earned: number;
  impression_count: number;
  click_count: number;
}

export interface DeveloperEarnings {
  period: string;
  total_earned: string;
  impression_earned: string;
  click_earned: string;
  impression_count: number;
  click_count: number;
  avg_cpm: string;
  data_points: EarningsPoint[];
}

export interface Campaign {
  id: string;
  advertiser_id: string;
  creative_text: string;
  destination_url: string;
  bid_cpm: string;
  click_multiplier: number;
  impressions_purchased: number;
  impressions_served: number;
  clicks_count: number;
  conversions_count?: number;
  total_spend: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GeoBreakdownItem {
  country: string;
  country_code: string;
  impressions: number;
  pct: number;
}

export interface TopDeveloperItem {
  display_name: string;
  impressions: number;
  clicks: number;
  pct: number;
}

export interface CampaignStats {
  campaign_id: string;
  impressions_served: number;
  impressions_purchased: number;
  clicks_count: number;
  conversions_count?: number;
  ctr: number;
  conversion_rate?: number;
  cpa?: number;
  roas?: number;
  total_spend: string;
  auction_position: number;
  completion_pct: number;
  daily_breakdown: Array<{ date: string; impressions: number }>;
  hourly_breakdown: Array<{ hour: string; impressions: number }>;
  daily_spend: Array<{ date: string; spend: number }>;
  geo_breakdown?: GeoBreakdownItem[];
  top_developers?: TopDeveloperItem[];
}

export interface DeveloperReferral {
  referral_code: string;
  referral_url: string;
  referral_count: number;
  total_bonus_cents: number;
}

export interface CampaignCheckout {
  campaign_id: string;
  checkout_url: string;
  total_cost_usd: string;
}

export interface AuctionBid {
  campaign_id: string;
  creative_text: string;
  bid_cpm: number;
  position: number;
  impressions_remaining: number;
}

export interface Payout {
  id: string;
  developer_id: string;
  amount_cents: number;
  razorpay_payout_id: string | null;
  wise_transfer_id: string | null;
  status: string;
  failure_reason: string | null;
  requested_at: string;
  completed_at: string | null;
}

// ─── Public stats types ───────────────────────────────────────────────────────

export interface PublicOverview {
  total_impressions: number;
  active_campaigns: number;
  developers_earning: number;
  avg_cpm_today: number;
}

export interface PublicImpressionChart {
  period: string;
  data: number[];
  labels: string[];
  total: number;
}

export interface CpmBucket {
  label: string;
  count: number;
  color: string;
}

export interface CategoryItem {
  label: string;
  pct: number;
  color: string;
}

export interface PublicCampaignsStats {
  cpm_distribution: CpmBucket[];
  categories: CategoryItem[];
}

export interface PublicFeedItem {
  brand: string;
  initials: string;
  loc: string;
  earned: string;
  ago: string;
  total_impressions: number;
}

export interface PublicFeed {
  items: PublicFeedItem[];
  impressions_per_second: number;
}

export interface LeaderEntry {
  rank: number;
  name: string;
  initials: string;
  loc: string;
  earned: number;
  impressions: number;
  referrals: number;
  badge: string | null;
}

export interface PublicLeaderboard {
  period: string;
  entries: LeaderEntry[];
  total_developers: number;
}


// ─── Razorpay types ───────────────────────────────────────────────────────────

export interface RazorpayOrderResponse {
  order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
}

export interface RazorpayVerifyPayment {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  campaign_id: string;
}

export interface RazorpayBankOnboard {
  account_number: string;
  ifsc: string;
  account_holder_name: string;
}

export interface RazorpayOnboardResponse {
  fund_account_id: string;
  provider: string;
  onboarded: boolean;
}

export interface PayoutProvider {
  provider: "razorpay" | "wise";
  onboarded: boolean;
  country: string;
}

export interface WiseOnboardData {
  account_holder_name: string;
  currency: string;
  payment_type: "iban" | "swift_code" | "aba" | "sort_code";
  account_number?: string;
  iban?: string;
  swift_code?: string;
  routing_number?: string;
}

export interface WiseOnboardResponse {
  wise_recipient_id: string;
  currency: string;
  provider: "wise";
  onboarded: boolean;
}

export interface TimeSeries {
  date: string;
  value: number;
}


export const api = {
  developer: {
    balance: (token: string) =>
      apiGet<DeveloperBalance>("/api/v1/developers/me/balance", token),
    earnings: (token: string, period: "today" | "week" | "month" | "year") =>
      apiGet<DeveloperEarnings>(`/api/v1/developers/me/earnings?period=${period}`, token),
    payouts: (token: string) =>
      apiGet<{ payouts: Payout[]; total: number }>("/api/v1/developers/me/payouts", token),
  },
  campaigns: {
    list: (token: string) => apiGet<Campaign[]>("/api/v1/campaigns", token),
    get: (id: string, token: string) => apiGet<Campaign>(`/api/v1/campaigns/${id}`, token),
    stats: (id: string, token: string) =>
      apiGet<CampaignStats>(`/api/v1/campaigns/${id}/stats`, token),
    create: (data: unknown, token: string) =>
      apiPost<CampaignCheckout>("/api/v1/campaigns", data, token),
    update: (id: string, data: { status: string }, token: string) =>
      apiPatch<Campaign>(`/api/v1/campaigns/${id}`, data, token),
    delete: (id: string, token: string) => apiDelete(`/api/v1/campaigns/${id}`, token),
    auction: (token: string) => apiGet<AuctionBid[]>("/api/v1/campaigns/auction/current", token),
  },
  payouts: {
    request: (amount_cents: number, token: string) =>
      apiPost<Payout>("/api/v1/payouts", { amount_cents }, token),
  },
  referral: {
    get: (token: string) => apiGet<DeveloperReferral>("/api/v1/developers/me/referral", token),
  },
  razorpay: {
    createOrder: (campaignId: string, token: string) =>
      apiPost<RazorpayOrderResponse>("/api/v1/razorpay/orders", { campaign_id: campaignId }, token),
    verifyPayment: (data: RazorpayVerifyPayment, token: string) =>
      apiPost<{ status: string; campaign_id: string }>("/api/v1/razorpay/verify-payment", data, token),
    onboardBank: (data: RazorpayBankOnboard, token: string) =>
      apiPost<RazorpayOnboardResponse>("/api/v1/razorpay/onboard/bank", data, token),
    onboardUpi: (vpa: string, token: string) =>
      apiPost<RazorpayOnboardResponse>("/api/v1/razorpay/onboard/upi", { vpa }, token),
  },
  payoutProvider: {
    get: (token: string) =>
      apiGet<PayoutProvider>("/api/v1/payouts/provider", token),
    switchProvider: (provider: "razorpay" | "wise", token: string) =>
      apiPatch<{ provider: string }>("/api/v1/payouts/provider", { provider }, token),
  },
  wise: {
    onboard: (data: WiseOnboardData, token: string) =>
      apiPost<WiseOnboardResponse>("/api/v1/payouts/onboard/wise", data, token),
  },
  publicStats: {
    overview: () => apiGet<PublicOverview>("/api/v1/public/stats/overview"),
    impressions: (period: "24h" | "7d" | "30d") =>
      apiGet<PublicImpressionChart>(`/api/v1/public/stats/impressions?period=${period}`),
    campaigns: () => apiGet<PublicCampaignsStats>("/api/v1/public/stats/campaigns"),
    feed: (limit = 10) => apiGet<PublicFeed>(`/api/v1/public/stats/feed?limit=${limit}`),
    leaderboard: (period: "month" | "alltime" = "month", limit = 50) =>
      apiGet<PublicLeaderboard>(`/api/v1/public/leaderboard?period=${period}&limit=${limit}`),
  },
};
