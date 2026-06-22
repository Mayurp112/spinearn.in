import type {
  DeveloperBalance,
  DeveloperEarnings,
  DeveloperReferral,
  Payout,
  PayoutProvider,
  Campaign,
  AuctionBid,
  CampaignStats,
  PublicOverview,
  PublicImpressionChart,
  PublicCampaignsStats,
  PublicFeed,
  PublicLeaderboard,
} from "@/lib/api";

// ─── Developer ────────────────────────────────────────────────────────────────

export const DEMO_BALANCE: DeveloperBalance = {
  pending_balance: "2847.50",
  paid_balance: "12340.00",
  today_earned: "47.80",
  week_earned: "328.40",
  hourly_cap_cents: 1000,
  daily_cap_cents: 10000,
};

export const DEMO_EARNINGS: DeveloperEarnings = {
  period: "week",
  total_earned: "328.40",
  impression_earned: "298.40",
  click_earned: "30.00",
  impression_count: 7460,
  click_count: 60,
  avg_cpm: "4.00",
  data_points: [
    { label: "Mon", earned: 42.5,  impression_earned: 38.5,  click_earned: 4.0,  impression_count: 960,  click_count: 8  },
    { label: "Tue", earned: 38.2,  impression_earned: 34.8,  click_earned: 3.4,  impression_count: 870,  click_count: 7  },
    { label: "Wed", earned: 55.1,  impression_earned: 50.1,  click_earned: 5.0,  impression_count: 1140, click_count: 10 },
    { label: "Thu", earned: 49.8,  impression_earned: 45.2,  click_earned: 4.6,  impression_count: 1060, click_count: 9  },
    { label: "Fri", earned: 63.4,  impression_earned: 57.6,  click_earned: 5.8,  impression_count: 1380, click_count: 11 },
    { label: "Sat", earned: 32.6,  impression_earned: 29.6,  click_earned: 3.0,  impression_count: 740,  click_count: 6  },
    { label: "Sun", earned: 47.8,  impression_earned: 43.6,  click_earned: 4.2,  impression_count: 1090, click_count: 9  },
  ],
};

export const DEMO_REFERRAL: DeveloperReferral = {
  referral_code: "SPINEARN2026",
  referral_url: "https://spinearn.dev/ref/SPINEARN2026",
  referral_count: 7,
  total_bonus_cents: 700,
};

// ─── Payouts ──────────────────────────────────────────────────────────────────

export const DEMO_PAYOUTS: { payouts: Payout[]; total: number } = {
  total: 3,
  payouts: [
    {
      id: "pyt-001",
      developer_id: "dev-001",
      amount_cents: 7500,
      stripe_transfer_id: "tr_3P8kQ2026demo01",
      status: "completed",
      failure_reason: null,
      requested_at: "2026-06-01T10:00:00Z",
      completed_at: "2026-06-02T15:30:00Z",
    },
    {
      id: "pyt-002",
      developer_id: "dev-001",
      amount_cents: 5000,
      stripe_transfer_id: "tr_3P8kQ2026demo02",
      status: "completed",
      failure_reason: null,
      requested_at: "2026-05-15T09:00:00Z",
      completed_at: "2026-05-16T11:20:00Z",
    },
    {
      id: "pyt-003",
      developer_id: "dev-001",
      amount_cents: 3200,
      stripe_transfer_id: null,
      status: "processing",
      failure_reason: null,
      requested_at: "2026-06-18T14:00:00Z",
      completed_at: null,
    },
  ],
};

export const DEMO_PAYOUT_PROVIDER: PayoutProvider = {
  provider: "razorpay",
  onboarded: true,
  country: "IN",
};

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-demo-001",
    advertiser_id: "adv-demo-001",
    creative_text: "Hire top engineers — Post your job on TechHire Pro",
    destination_url: "https://techhirepro.example.com",
    bid_cpm: "4.50",
    click_multiplier: 3,
    impressions_purchased: 50000,
    impressions_served: 23841,
    clicks_count: 312,
    conversions_count: 18,
    total_spend: "107.28",
    status: "active",
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-19T08:00:00Z",
  },
  {
    id: "camp-demo-002",
    advertiser_id: "adv-demo-001",
    creative_text: "Ship faster with BuildKit — CI/CD for modern dev teams",
    destination_url: "https://buildkit.example.com",
    bid_cpm: "3.20",
    click_multiplier: 2.5,
    impressions_purchased: 30000,
    impressions_served: 28104,
    clicks_count: 246,
    conversions_count: 11,
    total_spend: "89.93",
    status: "active",
    created_at: "2026-06-05T14:30:00Z",
    updated_at: "2026-06-19T07:45:00Z",
  },
  {
    id: "camp-demo-003",
    advertiser_id: "adv-demo-001",
    creative_text: "AI-powered code review — Catch bugs before they ship to prod",
    destination_url: "https://reviewbot.example.com",
    bid_cpm: "5.00",
    click_multiplier: 4,
    impressions_purchased: 20000,
    impressions_served: 20000,
    clicks_count: 389,
    conversions_count: 27,
    total_spend: "100.00",
    status: "exhausted",
    created_at: "2026-05-20T09:00:00Z",
    updated_at: "2026-06-10T16:00:00Z",
  },
];

export const DEMO_AUCTION: AuctionBid[] = [
  { campaign_id: "camp-demo-001", creative_text: "Hire top engineers — TechHire Pro",          bid_cpm: 4.50, position: 1, impressions_remaining: 26159 },
  { campaign_id: "camp-demo-002", creative_text: "Ship faster with BuildKit",                   bid_cpm: 3.20, position: 2, impressions_remaining: 1896  },
  { campaign_id: "ext-demo-001",  creative_text: "Debug smarter with LogRocket",                bid_cpm: 2.80, position: 3, impressions_remaining: 45000 },
  { campaign_id: "ext-demo-002",  creative_text: "Secure your APIs — Kong Gateway free trial",  bid_cpm: 2.10, position: 4, impressions_remaining: 12500 },
  { campaign_id: "ext-demo-003",  creative_text: "DevOps mastery — first month free",           bid_cpm: 1.50, position: 5, impressions_remaining: 9800  },
];

// ─── Campaign detail ──────────────────────────────────────────────────────────

export const DEMO_CAMPAIGN: Campaign = DEMO_CAMPAIGNS[0];

export const DEMO_CAMPAIGN_STATS: CampaignStats = {
  campaign_id: "camp-demo-001",
  impressions_served: 23841,
  impressions_purchased: 50000,
  clicks_count: 312,
  conversions_count: 18,
  ctr: 0.01309,
  conversion_rate: 0.0577,
  cpa: 5.96,
  roas: 2.40,
  total_spend: "107.28",
  auction_position: 0,
  completion_pct: 47.68,
  daily_breakdown: [
    { date: "Jun 13", impressions: 2890 },
    { date: "Jun 14", impressions: 3420 },
    { date: "Jun 15", impressions: 2740 },
    { date: "Jun 16", impressions: 3890 },
    { date: "Jun 17", impressions: 4120 },
    { date: "Jun 18", impressions: 3781 },
    { date: "Jun 19", impressions: 3000 },
  ],
  hourly_breakdown: [
    { hour: "2026-06-19T00:00:00", impressions: 320 },
    { hour: "2026-06-19T01:00:00", impressions: 280 },
    { hour: "2026-06-19T02:00:00", impressions: 190 },
    { hour: "2026-06-19T03:00:00", impressions: 140 },
    { hour: "2026-06-19T04:00:00", impressions: 90  },
    { hour: "2026-06-19T05:00:00", impressions: 120 },
    { hour: "2026-06-19T06:00:00", impressions: 180 },
    { hour: "2026-06-19T07:00:00", impressions: 380 },
    { hour: "2026-06-19T08:00:00", impressions: 620 },
    { hour: "2026-06-19T09:00:00", impressions: 840 },
    { hour: "2026-06-19T10:00:00", impressions: 960 },
    { hour: "2026-06-19T11:00:00", impressions: 1020},
    { hour: "2026-06-19T12:00:00", impressions: 980 },
    { hour: "2026-06-19T13:00:00", impressions: 910 },
    { hour: "2026-06-19T14:00:00", impressions: 870 },
    { hour: "2026-06-19T15:00:00", impressions: 820 },
    { hour: "2026-06-19T16:00:00", impressions: 760 },
    { hour: "2026-06-19T17:00:00", impressions: 680 },
    { hour: "2026-06-19T18:00:00", impressions: 540 },
    { hour: "2026-06-19T19:00:00", impressions: 440 },
    { hour: "2026-06-19T20:00:00", impressions: 380 },
    { hour: "2026-06-19T21:00:00", impressions: 340 },
    { hour: "2026-06-19T22:00:00", impressions: 310 },
    { hour: "2026-06-19T23:00:00", impressions: 290 },
  ],
  daily_spend: [
    { date: "2026-06-13", spend: 13.01 },
    { date: "2026-06-14", spend: 15.39 },
    { date: "2026-06-15", spend: 12.33 },
    { date: "2026-06-16", spend: 17.51 },
    { date: "2026-06-17", spend: 18.54 },
    { date: "2026-06-18", spend: 17.01 },
    { date: "2026-06-19", spend: 13.49 },
  ],
  geo_breakdown: [
    { country: "United States",  country_code: "US", impressions: 10890, pct: 45.7 },
    { country: "India",          country_code: "IN", impressions: 5462,  pct: 22.9 },
    { country: "United Kingdom", country_code: "GB", impressions: 2861,  pct: 12.0 },
    { country: "Germany",        country_code: "DE", impressions: 1668,  pct: 7.0  },
    { country: "Canada",         country_code: "CA", impressions: 1192,  pct: 5.0  },
    { country: "Others",         country_code: "XX", impressions: 1768,  pct: 7.4  },
  ],
  top_developers: [
    { display_name: "vikram_k",     impressions: 2840, clicks: 38, pct: 11.9 },
    { display_name: "alex_codes",   impressions: 2210, clicks: 29, pct: 9.3  },
    { display_name: "priya_dev",    impressions: 1980, clicks: 24, pct: 8.3  },
    { display_name: "jon_m",        impressions: 1640, clicks: 20, pct: 6.9  },
    { display_name: "sarah_builds", impressions: 1420, clicks: 18, pct: 6.0  },
  ],
};

// ─── Public stats ─────────────────────────────────────────────────────────────

export const DEMO_OVERVIEW: PublicOverview = {
  total_impressions: 4820340,
  active_campaigns: 47,
  developers_earning: 312,
  avg_cpm_today: 4.50,
};

export const DEMO_CHARTS: Record<string, PublicImpressionChart> = {
  "24h": {
    period: "24h",
    data: [320, 280, 190, 140, 90, 120, 180, 380, 620, 840, 960, 1020, 980, 910, 870, 820, 760, 680, 540, 440, 380, 340, 310, 290],
    labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:00"],
    total: 12240,
  },
  "7d": {
    period: "7d",
    data: [38200, 44100, 35800, 52400, 61300, 48700, 42100],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    total: 322600,
  },
  "30d": {
    period: "30d",
    data: [
      28400, 31200, 29800, 33100, 35400, 30200, 27600,
      38200, 44100, 35800, 52400, 61300, 48700, 42100,
      39400, 45600, 41200, 37800, 43900, 55100, 49300,
      42800, 38600, 46200, 53700, 58900, 47400, 44200,
      51300, 48700,
    ],
    labels: ["Jun 1", "Jun 8", "Jun 15", "Jun 22", "Jun 19"],
    total: 1322100,
  },
};

export const DEMO_CAMPAIGNS_STATS: PublicCampaignsStats = {
  cpm_distribution: [
    { label: "$1–2", count: 8,  color: "#64748b" },
    { label: "$2–3", count: 14, color: "#3b82f6" },
    { label: "$3–4", count: 11, color: "#6366f1" },
    { label: "$4–5", count: 9,  color: "#8b5cf6" },
    { label: "$5–7", count: 4,  color: "#a855f7" },
    { label: "$7+",  count: 1,  color: "#ec4899" },
  ],
  categories: [
    { label: "Developer Tools", pct: 38, color: "#3b82f6" },
    { label: "SaaS / B2B",      pct: 24, color: "#6366f1" },
    { label: "Job Boards",      pct: 18, color: "#8b5cf6" },
    { label: "Open Source",     pct: 12, color: "#10b981" },
    { label: "Education",       pct: 8,  color: "#f59e0b" },
  ],
};

export const DEMO_FEED: PublicFeed = {
  impressions_per_second: 0.28,
  items: [
    { brand: "TechHire Pro",  initials: "VK", loc: "Mumbai",        earned: "$0.0045", ago: "3s",  total_impressions: 23841 },
    { brand: "BuildKit",      initials: "AJ", loc: "San Francisco", earned: "$0.0032", ago: "7s",  total_impressions: 28104 },
    { brand: "ReviewBot",     initials: "PS", loc: "Berlin",        earned: "$0.0050", ago: "11s", total_impressions: 20000 },
    { brand: "TechHire Pro",  initials: "RK", loc: "Bangalore",     earned: "$0.0045", ago: "18s", total_impressions: 23841 },
    { brand: "LogRocket",     initials: "TW", loc: "London",        earned: "$0.0028", ago: "25s", total_impressions: 45200 },
    { brand: "BuildKit",      initials: "MP", loc: "Toronto",       earned: "$0.0032", ago: "31s", total_impressions: 28104 },
    { brand: "Kong Gateway",  initials: "SL", loc: "New York",      earned: "$0.0021", ago: "38s", total_impressions: 12500 },
    { brand: "TechHire Pro",  initials: "DH", loc: "Austin",        earned: "$0.0045", ago: "44s", total_impressions: 23841 },
    { brand: "ReviewBot",     initials: "NP", loc: "Amsterdam",     earned: "$0.0050", ago: "52s", total_impressions: 20000 },
    { brand: "LogRocket",     initials: "CK", loc: "Sydney",        earned: "$0.0028", ago: "1m",  total_impressions: 45200 },
  ],
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export const DEMO_LEADERBOARD: PublicLeaderboard = {
  period: "month",
  total_developers: 312,
  entries: [
    { rank: 1,  name: "vikram_k",    initials: "VK", loc: "Mumbai",        earned: 284.50, impressions: 63220, referrals: 12, badge: "top earner" },
    { rank: 2,  name: "alex_codes",  initials: "AC", loc: "San Francisco", earned: 218.30, impressions: 48510, referrals: 8,  badge: null         },
    { rank: 3,  name: "priya_dev",   initials: "PD", loc: "Bangalore",     earned: 196.80, impressions: 43730, referrals: 5,  badge: null         },
    { rank: 4,  name: "jon_m",       initials: "JM", loc: "Berlin",        earned: 178.40, impressions: 39640, referrals: 3,  badge: null         },
    { rank: 5,  name: "sarah_b",     initials: "SB", loc: "London",        earned: 155.60, impressions: 34580, referrals: 7,  badge: null         },
    { rank: 6,  name: "dev_rodrigo", initials: "DR", loc: "São Paulo",     earned: 142.20, impressions: 31600, referrals: 2,  badge: null         },
    { rank: 7,  name: "nina_codes",  initials: "NC", loc: "Amsterdam",     earned: 131.90, impressions: 29310, referrals: 4,  badge: null         },
    { rank: 8,  name: "tom_k",       initials: "TK", loc: "Toronto",       earned: 118.40, impressions: 26310, referrals: 1,  badge: null         },
    { rank: 9,  name: "mei_dev",     initials: "MD", loc: "Singapore",     earned: 108.70, impressions: 24160, referrals: 3,  badge: null         },
    { rank: 10, name: "raj_full",    initials: "RF", loc: "Hyderabad",     earned: 97.50,  impressions: 21670, referrals: 0,  badge: null         },
    { rank: 11, name: "carlos_m",    initials: "CM", loc: "Madrid",        earned: 88.30,  impressions: 19620, referrals: 2,  badge: null         },
    { rank: 12, name: "emma_dev",    initials: "ED", loc: "Paris",         earned: 79.80,  impressions: 17730, referrals: 1,  badge: null         },
  ],
};
