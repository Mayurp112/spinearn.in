# SpinEarn / SpinEarn — Go-to-Market & Public Launch Plan

> **Tagline:** Get paid while Claude Code thinks.
> **Status document:** Treat this as a living playbook. Update targets monthly.

---

## CONTEXT SNAPSHOT

| Item | Detail |
|---|---|
| Product | VS Code extension — monetizes Claude Code / Codex AI spinner wait time |
| Developer value prop | Passive income, zero workflow change, enterprise-safe |
| Advertiser value prop | Reach developers at the exact moment they are blocked and receptive |
| Direct competitor | Kickbacks.ai (launched June 11 2026, payouts not yet live) |
| Other competitors | IdleAds.dev (70% share), Idlen.io (70% share), Sponsoric (70%) |
| SpinEarn share | 50% — same as Kickbacks, but payouts are actually live |
| Payment rails | Razorpay (India, INR), Wise (global), $10 minimum |
| Advertiser payment | Razorpay (INR) + Wise invoice for non-India advertisers |
| Fraud protection | 50¢/hr cap, $5/day cap, PostgreSQL audit trail |

---

## PART 1 — PUBLIC INTRODUCTION STRATEGY

### 1.1 Startup Community Launches

---

#### Product Hunt

**Launch title:** SpinEarn — Earn passive income from your Claude Code wait time

**Tagline:** Your AI is thinking. You're earning. VS Code extension that pays devs 50% of ad revenue.

**Launch date strategy:** Launch Tuesday or Wednesday Pacific time, 12:01 AM. Avoid Mondays (lowest traffic). Pre-rally 15–20 developer friends to upvote within the first 2 hours — this is the only hour that matters for top-5 placement.

**First comment (post this yourself within 5 minutes of launch):**

> Hey Product Hunt! Mayur here, maker of SpinEarn.
>
> The idea came from frustration: I noticed I stare at the Claude Code spinner dozens of times a day. That's dead time — for me AND for advertisers who want to reach developers.
>
> SpinEarn turns those 5-second wait windows into passive income. Install the VS Code extension, code normally, and earn 50% of the ad revenue from ads shown during AI spinner states. No clicks required. No workflow changes. Enterprise-safe — no CSP patching, no unsigned auto-updates.
>
> First payout went out last week. [screenshot]
>
> Two things I'd love feedback on:
> 1. For developers — what would make you trust this enough to install?
> 2. For dev tool companies — is the "reach developers while they wait" angle compelling for your ad budget?
>
> Ask me anything.

**Hunter strategy:** Ask a well-known developer on Twitter/X (someone with 10k+ followers who has shipped extensions) to hunt you. A recognizable hunter adds 15–25% more clicks on launch day.

**Gallery assets needed:** Extension screenshot in VS Code dark theme, earnings dashboard screenshot, architecture diagram (enterprise-safe angle), demo GIF of spinner + ad overlay.

---

#### Hacker News — Show HN

**Exact title:**
`Show HN: SpinEarn – VS Code extension that pays you 50% of ad revenue during Claude Code waits`

**Post body (keep under 300 words — HN penalizes longer submissions):**

> I built SpinEarn after noticing I stare at the Claude Code/Codex spinner for 5–15 seconds dozens of times per day. Those moments are dead time with a captive, high-value audience.
>
> How it works:
> - Install the VS Code extension
> - While Claude Code is thinking, a 5-second ad appears in the status bar / side panel
> - Advertisers bid for 1,000-impression blocks via English ascending auction
> - Developers get 50% of revenue. Payouts via Razorpay (India) and Wise (global), $10 minimum
>
> Enterprise-safe design: no Content Security Policy patching, no unsigned auto-updates, PostgreSQL audit trail for every impression. Fraud prevention: 50¢/hr cap, $5/day cap per developer.
>
> Competitor Kickbacks.ai launched June 11 and has traction — their payouts aren't live yet. Ours are.
>
> Live at: [URL]

**HN comment strategy:**

- Do NOT oversell. HN punishes marketing language.
- Respond to every comment within 30 minutes during the first 3 hours.
- Anticipate and pre-write answers to: "Is this spyware?", "What prevents ad fraud?", "Why would advertisers pay for this?", "What's your CPM?", "How do you handle Kickbacks competition?", "Is the extension open source?"
- If someone says "this is just Kickbacks but later," respond: "Kickbacks launched June 11. Our audit trail, enterprise CSP safety, and live payouts are the diff. Happy to compare architectures if useful."
- Flag the thread to developer friends before posting — coordinated upvotes within first 15 minutes help front-page placement.

---

#### Indie Hackers

**Post angle:** Founder story + revenue transparency

**Title:** `I built a VS Code extension that monetizes AI wait time — here's month 1 revenue`

**Content structure:**

1. The problem (staring at spinner, dead time, captive audience)
2. The build (how long, tech stack, hardest part — enterprise CSP safety)
3. The market (CPM $8–15, Kickbacks.ai as validation that the idea works)
4. Transparent numbers: X installs, Y advertisers, $Z gross revenue, $W developer payouts
5. What's next
6. Ask the IH community: "What would make you install this / advertise here?"

**Post frequency:** Post a milestone update every 4–6 weeks. Indie Hackers rewards consistency and transparency. Share payout screenshots (with developer permission or blurred names).

---

#### BetaList

Submit 2 weeks before public launch. BetaList has a 1–3 week review queue. Use the developer-focused category. Collect emails from interested developers who sign up — these are your highest-intent early adopters. Follow up with a personal email from the founder on launch day.

**Tagline for BetaList:** `Passive income for VS Code users — earn while Claude Code thinks`

---

#### Peerlist

Peerlist skews toward Indian tech community and builders — highly relevant given the Razorpay/INR payment infrastructure. Post in the "Side Projects" and "Dev Tools" sections.

**Post title:** `SpinEarn — I built a passive income layer on top of Claude Code's wait time`

Tag relevant Peerlist members in the dev tools space. Cross-post your IH milestone posts here.

---

#### Dev Hunt

Dev Hunt is a smaller, developer-specific Product Hunt. Lower competition means higher chance of featured placement. Launch here the week after Product Hunt to capture the secondary wave.

**Title:** `SpinEarn – Get paid while Claude Code thinks (VS Code extension)`

---

#### AlternativeTo

Create a SpinEarn listing and explicitly list it as an alternative to Kickbacks.ai. Use the description to highlight the live payout advantage, enterprise CSP safety, and the 50¢/hr fraud cap.

**Description for AlternativeTo:**
> SpinEarn is a VS Code extension that pays developers 50% of ad revenue generated during Claude Code / Codex AI spinner wait states. Unlike Kickbacks.ai, SpinEarn payouts are live (Razorpay + Wise), uses zero CSP patching making it enterprise-safe, and includes a full PostgreSQL audit trail. Advertisers bid on 1,000-impression blocks via ascending auction.

---

#### LaunchingNext and StartupBase

Submit on the same day. These aggregate launch directories have smaller audiences but improve SEO through backlinks. Use the same title and description as BetaList. Include the VS Code Marketplace link prominently.

---

### 1.2 Developer Communities

---

#### GitHub

**Strategy:** Open-source the extension client (not the backend auction engine). This accomplishes three things:
- Developers can audit that you're not doing anything malicious (critical for trust)
- GitHub stars act as social proof
- Issues/PRs create community engagement

**README badges to include:**
- VS Code Marketplace installs badge
- GitHub stars badge
- "Enterprise Safe" badge (custom shield.io badge)
- Payout status badge (green = "Payouts Live")

**README headline:** `Get paid while Claude Code thinks — VS Code extension, 50% revenue share, payouts live`

**What to open-source:** The extension client, the impression tracking logic, the anti-fraud cap implementation. Keep the auction engine and bid management proprietary.

---

#### Reddit

Post in this exact order — each community requires a different angle:

**r/ClaudeAI** — `"I built a VS Code extension that pays you while Claude Code is thinking — 5-second ads during spinner states"`

This is your highest-intent subreddit. Claude Code users are the exact target. Post with a demo GIF. Respond to every comment.

**r/vscode** — `"Show r/vscode: SpinEarn — passive income extension that monetizes Claude Code wait time"`

Focus on the extension quality, not the money angle. Show the status bar integration. Mention enterprise CSP safety prominently — r/vscode has enterprise devs.

**r/SideProject** — `"I noticed I stare at the Claude Code spinner 50x/day. Built an extension that pays me for it. Month 1 numbers inside."`

Founder story angle. Share revenue numbers. This subreddit loves transparency.

**r/ExperiencedDevs** — `"Genuine question: would you install a VS Code extension that shows 5-second ads during AI wait states in exchange for 50% of revenue?"`

Frame as a discussion, not a promotion. Get feedback. Do NOT link the product in the original post — wait for someone to ask.

**r/cscareerquestions** — `"Side income for developers who use AI: passive earnings from your Claude Code wait time (no extra work needed)"`

Focus on passive income angle. Frame around FAANG devs who already use Claude Code heavily. Mention that the money is proportional to how much AI you use.

**r/webdev** — Post after you have the first earnings screenshot. Title: `"My Claude Code extension earned me $X last month while I coded normally"`

**Reddit rules to follow:**
- Never post the same content to multiple subreddits simultaneously — wait 48 hours between posts.
- Do not use tracking links in Reddit posts (it signals spam).
- Comment karma matters — build karma in each subreddit before your launch post.
- Never delete a post, even if it's downvoted. Deleting signals you were spamming.

---

#### Dev.to

**Primary article:** `I Built a VS Code Extension That Pays You While Claude Code Thinks — Here's How`

Content outline:
1. The observation (spinner = dead time = captive audience)
2. How the auction works (advertiser bids, impression blocks, ascending auction mechanics)
3. How you receive payment ($10 minimum, Razorpay India, Wise global)
4. The enterprise safety question (CSP, auto-updates, audit trail)
5. First payout screenshot
6. Link to install

**Secondary articles:**
- `How I Built an English Ascending Auction in Node.js for Developer Ads`
- `VS Code Extension Security: Why CSP Patching Is a Red Flag`
- `Passive Income for Developers in 2026: A Realistic Look at What Actually Pays`

Post at 9 AM UTC on Tuesdays or Wednesdays for maximum Dev.to front-page exposure. Tag: `#vscode`, `#productivity`, `#career`, `#javascript`.

---

#### Hashnode

Cross-post the Dev.to articles to Hashnode with canonical URL pointing back to Dev.to (or your own blog). Hashnode's developer audience overlaps with but is distinct from Dev.to. Join the "VS Code" and "Developer Tools" Hashnode publications and submit your articles for republication there.

---

#### Medium

Publish on Medium under the "Better Programming" and "Towards Data Science" publications — these have large developer audiences. The article angle for Medium: `"The Economics of Developer Attention: How AI Wait States Became Advertising Inventory"` — more analytical, less tutorial.

---

#### Stack Overflow

**What NOT to do:** Do not post questions designed to mention SpinEarn. Do not post answers with links to SpinEarn unless it is genuinely the best answer. Stack Overflow users will flag and remove promotional content aggressively, and it will damage your reputation.

**What TO do:** Answer real questions about VS Code extension development, ad auction mechanics, and Razorpay integration. Build genuine credibility. Include SpinEarn in your Stack Overflow profile.

---

#### daily.dev

Submit SpinEarn articles to daily.dev. The platform automatically indexes Dev.to, Hashnode, and Medium articles — your cross-posts will appear there automatically. You can also post directly in daily.dev squads. Join the "VS Code Extensions" and "Developer Tools" squads.

---

### 1.3 Social Platforms

---

#### Twitter/X

**Key thread formats that work for developer tools:**

Thread 1 — The Observation (launch week):
```
I noticed something while using Claude Code.

I stare at this spinner [screenshot] for 5–15 seconds, 50+ times per day.

That's 4–12 minutes of dead time.

Dead time with a captive, high-value audience (developers).

I built something about it. Thread 🧵
```
Continue with: how SpinEarn works, first payout screenshot, install link.

Thread 2 — The Transparency Post (month 2):
```
Month 1 SpinEarn numbers (full transparency):

- X developers installed
- Y advertiser campaigns
- $Z gross ad revenue
- $W paid out to developers
- My take: $V

What I learned, what I'm changing, what's next.
```

Thread 3 — The Competitor Analysis (ongoing):
```
There are 4 idle-time ad extensions for VS Code now.

Here's how they compare on what actually matters to developers:

[table comparing SpinEarn, Kickbacks.ai, IdleAds.dev, Idlen.io on: revenue share, payouts live, enterprise-safe, fraud protection, minimum payout]

The one thing Kickbacks doesn't have yet: live payouts.
```

**Tweet cadence:** 1 original tweet/thread per day, 5–10 replies to developer conversation threads. Do not just broadcast — engage.

**Accounts to follow and engage with:** VS Code team accounts, Claude/Anthropic developer relations, popular extension authors, developer productivity influencers.

---

#### LinkedIn

**Primary use:** Advertiser acquisition, not developer acquisition.

Target job titles: Developer Relations Manager, Developer Marketing Manager, Head of Developer Experience, VP Marketing at dev tool companies.

**Content angle for LinkedIn:**
- "Why developer tool companies are advertising in AI wait states" — thought leadership
- Case studies once you have advertiser results
- "How to reach 10,000 developers who are blocked and receptive" — advertiser pitch

**Direct outreach strategy:** Connect with DevRel managers at Supabase, Railway, Vercel, Sentry, PostHog, Linear, Render, PlanetScale, Neon, Turso, Fly.io. Send a connection request with a note: "I run SpinEarn — we show 5-second ads to developers during Claude Code waits. I think [Company] would be a natural fit. Happy to share our CPM and audience data."

---

#### YouTube

**Essential video:** A 3–5 minute demo video showing:
1. Installing the extension (30 seconds)
2. Using Claude Code normally — the spinner appears, an ad appears (60 seconds)
3. The earnings dashboard — real numbers (60 seconds)
4. The payout process (30 seconds)
5. Call to action: install link

This video is your primary conversion tool. Embed it on your VS Code Marketplace page, Product Hunt listing, and landing page.

**Secondary videos:** "How the auction works" (for advertisers), "Is this safe? SpinEarn security deep-dive" (for skeptics).

---

#### Threads and Instagram

Lower priority. Explanation: SpinEarn's audiences — developers and dev tool marketers — are not primarily on Threads or Instagram. The content format (visual, short-form) does not suit technical explanations. Time spent here has 5–10x lower ROI than Twitter/X, Reddit, or Dev.to.

Only exception: If your earnings screenshots go viral on Twitter, cross-post the graphic to Threads for the secondary reach. Otherwise, deprioritize until Month 4+.

---

### 1.4 Business and SaaS Directories

---

#### VS Code Marketplace Listing Optimization

This is your most important "directory." Treat it as your primary landing page.

**Extension name:** SpinEarn — Passive Income for Claude Code Users

**Short description (150 chars max):** Earn 50% of ad revenue shown during Claude Code / Codex AI wait states. No clicks. No workflow changes. Payouts via Razorpay + Wise.

**Detailed description must include:**
- How it works (3 bullet points)
- Enterprise safety callout (no CSP patching, signed updates, audit trail)
- Payout details ($10 minimum, Razorpay India, Wise global)
- Current CPM range ($8–15)
- Link to earnings transparency report

**Keywords in marketplace:** claude code, passive income, monetize, ads, earn, developer income, ai wait

**Gallery:** 5 screenshots minimum — spinner with ad, earnings dashboard, payout confirmation, settings panel, architecture diagram.

---

#### G2 and Capterra

These skew toward SaaS buyers, not developers. However, they are useful for the advertiser side of SpinEarn — dev tool companies evaluating SpinEarn as an ad channel will search G2.

**Strategy:** Create a listing in the "Developer Tools Advertising" or "Ad Network" category on G2. Describe SpinEarn from the advertiser's perspective: "Reach 10,000+ developers during AI-assisted coding sessions. Pay only for impressions. Bid-based pricing."

Ask your first 3 advertisers to leave a G2 review — even one review increases credibility significantly.

---

#### Dev Tool Comparison Sites

Submit to StackShare.io (developers share their stack — SpinEarn fits as a "earn" tool). Submit to alternativeto.net (already covered above). Submit to Slant.co under "VS Code extensions."

---

### 1.5 SEO and Content Marketing

---

#### Target Keywords

| Keyword | Monthly Search Est. | Intent |
|---|---|---|
| get paid to use Claude Code | Low (emerging) | Developer |
| VS Code extension earn money | Medium | Developer |
| developer passive income 2026 | Medium | Developer |
| AI wait time monetization | Low | Advertiser |
| Claude Code extension | Medium | Developer |
| Kickbacks.ai alternative | Low (growing) | Both |
| developer ad network | Medium | Advertiser |
| reach developers advertising | Medium | Advertiser |

---

#### 10 Blog Post Ideas (specific to SpinEarn)

1. `"Get Paid While Claude Code Thinks: A Developer's Guide to SpinEarn"`
2. `"How I Earned $X Passively in Month 1 Using an AI Wait State Extension"`
3. `"SpinEarn vs Kickbacks.ai: An Honest Comparison (June 2026)"`
4. `"Why Developer Attention During AI Wait States Is Worth $8–15 CPM"`
5. `"Enterprise-Safe VS Code Extensions: What CSP Patching Actually Means"`
6. `"The Economics of Developer Idle Time: A Market Analysis"`
7. `"How to Reach 10,000 Developers Who Are Actively Using AI Coding Tools"`
8. `"SpinEarn Payout Guide: Razorpay, Wise, and Your First $10"`
9. `"The English Ascending Auction: How SpinEarn Prices Developer Attention"`
10. `"From Zero to 700 Developer Users: SpinEarn's First 90 Days"`

---

#### Guest Posting Targets

- **The New Stack** (thenewstack.io) — Developer tool companies read this. Pitch: "The New Ad Channel That Lives Inside Your IDE"
- **Smashing Magazine** — "Monetizing the VS Code Extension Ecosystem"
- **CSS-Tricks / Geek for Geek** — Tutorial-style posts
- **DEV Community (Dev.to)** — Already covered, but also pitch the editors for front-page feature
- **Changelog.com** — Pitch for a podcast appearance on "The Changelog" or "JS Party"

---

#### Programmatic SEO Opportunities

Create comparison landing pages:
- `/vs/kickbacks-ai` — SpinEarn vs Kickbacks.ai (live payouts vs. pending)
- `/vs/idleads` — SpinEarn vs IdleAds.dev (50% vs 70% share — explain why audit trail justifies the difference)
- `/vs/idlen-io` — SpinEarn vs Idlen.io (extension-native vs SDK-based)
- `/alternatives/carbon-ads` — SpinEarn as a developer ad channel vs Carbon Ads

Each page needs: feature comparison table, pricing comparison, payout comparison, enterprise safety comparison.

---

## PART 2 — ADVERTISING STRATEGY

### Phase 1 — Organic Growth (Month 1–2, $0 budget)

**Week 1 actions (in order):**
1. Publish the VS Code Marketplace listing with full optimization
2. Submit to BetaList (1–3 week queue, so do this first)
3. Post on r/ClaudeAI with demo GIF
4. Tweet the launch thread
5. Post Show HN

**Week 2 actions:**
1. Post on r/SideProject with month 0 numbers
2. Publish Dev.to primary article
3. Submit to Product Hunt (schedule for next week's Tuesday)
4. Reach out to 5 developer Twitter accounts for hunting/sharing

**Influencer outreach template:**
> Hi [Name], I'm Mayur. I built SpinEarn — a VS Code extension that pays devs 50% of ad revenue during Claude Code wait states. Payouts are live. I noticed you cover VS Code extensions/developer tools and thought your audience might find this interesting. Would you be open to a quick look? Happy to share an early access code or earnings data. No obligation.

**Target accounts for outreach:**
- Developer YouTubers with 20k+ subscribers who cover VS Code: Fireship, Theo (t3.gg), Josh tried coding, Jack Herrington
- Twitter developers: @swyx, @adamwathan, @kentcdodds, @wesbos, @tannerlinsley (reach out only if genuinely relevant to their content)

**Partnership — Anthropic/Claude community:**
Email Claude Code community managers at Anthropic. Pitch: "SpinEarn monetizes Claude Code usage for developers. This could be a compelling benefit to highlight for your developer community." They may not promote it officially, but awareness at Anthropic is valuable.

**First payout screenshot strategy:** This is your single most powerful organic content piece. The moment the first developer receives a payout, get their permission, create a clean screenshot (earnings dashboard + Wise/Razorpay confirmation), and post it across every platform simultaneously. Caption: "First SpinEarn payout sent. [Developer] earned $X just by using Claude Code normally."

---

### Phase 2 — Validation Ads (Month 3–4, $200–500/month)

**Channel allocation:**

| Channel | Budget | Expected Result |
|---|---|---|
| Reddit Ads (r/programming, r/webdev, r/ClaudeAI) | $120/month | 300–600 developer clicks at $0.20–$0.40 CPC |
| Twitter/X Ads (developer interest targeting) | $80/month | 200–400 clicks |
| Google Ads (branded + intent keywords) | $100/month | 100–200 clicks from high-intent searches |
| **Total** | **$300/month** | |

**Reddit Ad copy (developer install):**
> Headline: Your Claude Code spinner is worth money
> Body: SpinEarn pays you 50% of ad revenue from 5-second ads shown during AI wait states. Install once. Code normally. First payout at $10.
> CTA: Install Free

**Twitter/X Ad copy:**
> Thread-style ad: "I stare at the Claude Code spinner 50+ times a day. I built an extension that pays me for it. [screenshot] → spinearn.in"

**Google Ads keywords:**
- `claude code extension` (high intent)
- `vscode monetization extension`
- `developer passive income extension`
- `spinearn.in` (branded)
- `kickbacks.ai alternative` (competitor)

---

### Phase 3 — Scale (Month 5+, $1,000+/month)

**Retargeting setup:** Install a pixel on spinearn.in homepage. Retarget visitors who did not install the extension. Ad copy: "Still thinking about SpinEarn? First payout takes 3 minutes to set up. [earnings screenshot]"

**Developer newsletter sponsorships (with approximate rates):**
- **Bytes.dev** (JavaScript newsletter, 200k+ subscribers): ~$2,000/issue. Negotiate a 3-issue package.
- **TLDR.tech** (developer newsletter, 1M+ subscribers): ~$4,000/issue. Start after Month 6 when you have 500+ installs as social proof.
- **Cooper Press newsletters** (JavaScript Weekly, Node Weekly, etc.): ~$500–800/issue. Better ROI for small budgets.
- **Console.dev** (developer tools newsletter): ~$300–500/issue. Highly targeted to dev tool audience.

**Affiliate program launch (referral_code in DB schema):**
- Offer developers 10% of the earnings of any developer they refer, for 6 months.
- Offer advertisers 5% credit on their first campaign for referring another advertiser.
- Track via existing referral_code schema column.

---

## PART 3 — ADVERTISER ACQUISITION STRATEGY

This section is critical. Without advertisers, developer earnings are $0 and the product fails. Treat advertiser acquisition as equally important as developer installs.

### Target Advertiser List (30+ companies)

These are dev tool companies whose core customer is exactly the developer using Claude Code:

**Tier 1 — Highest fit (database, infra, deployment):**
1. Supabase — DevRel: supabase.com/blog team
2. Railway — @railway on Twitter
3. Render — render.com/blog
4. Neon (serverless Postgres) — neon.tech
5. PlanetScale — planetscale.com
6. Turso (SQLite edge) — turso.tech
7. Fly.io — fly.io/blog
8. DigitalOcean — developer marketing team
9. Cloudflare Workers — developer relations
10. Vercel — developer experience team

**Tier 2 — Observability, monitoring, error tracking:**
11. Sentry — sentry.io/for/developers
12. PostHog — posthog.com
13. Datadog — developer advocacy team
14. New Relic — developer relations
15. Grafana Cloud — grafana.com
16. Highlight.io — emerging observability tool

**Tier 3 — Developer productivity and collaboration:**
17. Linear — linear.app
18. Notion — developer API team
19. Retool — retool.com
20. Clerk (auth) — clerk.com
21. Auth0 / Okta Developer — developer marketing
22. Stripe Developer Platform — developer relations
23. Twilio — developer evangelism team
24. GitHub (Copilot competitor awareness) — github.com
25. GitLab — developer relations

**Tier 4 — Emerging dev tools (high growth, smaller budget but relevant):**
26. Mintlify (docs) — mintlify.com
27. Resend (email API) — resend.com
28. Upstash (serverless Redis) — upstash.com
29. Trigger.dev (background jobs) — trigger.dev
30. Inngest (event-driven functions) — inngest.com
31. Deno Deploy — deno.com/deploy
32. Bun — bun.sh
33. Encore.dev — encore.dev

---

### Cold Outreach Email Template

**Subject:** Advertising to developers during Claude Code sessions — SpinEarn

**Body:**
> Hi [Name],
>
> I'm Mayur, founder of SpinEarn. We run the ad layer inside VS Code for developers using Claude Code — our extension shows a 5-second ad in the IDE during AI spinner wait states.
>
> Why it matters for [Company]: Your ideal customer is a developer actively blocked on a task, receptive to a tool that unblocks them. Our impression happens at exactly that moment — not in a social feed, not in a podcast, inside their coding environment while they wait.
>
> Current metrics:
> - [X] active developer installs
> - Market CPM: $8–15 (developer-targeted)
> - 5-second impression blocks, 1,000 impressions per block
> - Clicks worth 50× impressions in bidding weight
>
> Minimum buy: 1 block at $[floor price]. Self-serve auction at spinearn.in/advertise.
>
> Would it make sense to run a test campaign? Happy to share our audience breakdown and fraud prevention architecture.
>
> Best,
> Mayur
> spinearn.in

**Follow-up cadence:** Email Day 1, LinkedIn message Day 4, Twitter DM Day 8, final email Day 15. Do not send more than 4 touchpoints.

---

### Self-Serve Portal as Key Enabler

The self-serve advertiser portal (spinearn.in/advertise) is mandatory before scaling advertiser acquisition. Without it, every advertiser requires manual onboarding — this does not scale.

The portal must show:
- Live bid queue (public — this is social proof of a functioning market)
- Current floor price per 1,000-impression block
- Estimated reach based on current developer installs
- Razorpay payment integration (INR) + Wise invoice option (global)
- Campaign status dashboard

**Public bid queue = social proof:** When a new advertiser lands on the portal and sees 3 active campaigns bidding against each other, it validates the platform. Prioritize making this visible.

---

### BuySellAds and Carbon Ads as Advertiser Network Channels

**BuySellAds:** Apply to be listed as an ad property in BSA's Developer category. BSA has relationships with the exact dev tool companies on the target list. They take a commission but bring pre-qualified advertisers. Apply at buysellads.com/sell.

**Carbon Ads:** Carbon Ads serves developer-focused properties. Contact them about a SpinEarn partnership — they may be able to fill unsold inventory or co-sell.

**Caveat:** Both channels take 30–40% of revenue. Use them only for inventory that would otherwise go unfilled. Direct advertisers via spinearn.in/advertise are always preferable.

---

## PART 4 — LAUNCH TIMELINE

### Pre-Launch (30 Days Before)

**Week 1–2: Infrastructure and accounts**
- [ ] VS Code Marketplace developer account verified and ready to publish
- [ ] spinearn.in landing page live with email capture
- [ ] Twitter/X account @spinearns or @spinads (secure handles now)
- [ ] LinkedIn company page created
- [ ] GitHub repo public (open-source client)
- [ ] Google Analytics 4 + custom events (install clicks, payout views)
- [ ] BetaList submission sent
- [ ] Self-serve advertiser portal functional (basic version)

**Week 3: Beta tester recruitment**
- Recruit 50 developers from your network and early sign-ups
- Give them private access 10 days before launch
- Goal: collect first real payout by launch day
- Collect testimonials and earnings screenshots (with permission)
- Fix bugs reported by beta users — the extension must be stable on launch day

**Week 4: Soft launch preparation**
- Draft all launch posts (Product Hunt, HN, Reddit, Dev.to)
- Schedule Twitter thread for launch day
- Brief hunter (if using a third-party hunter) on the product
- Email beta users asking for Day 1 upvotes on Product Hunt
- Prepare earnings screenshot from beta period for social proof

---

### Launch Week

| Day | Action |
|---|---|
| Monday | VS Code Marketplace: publish the extension. Post to r/vscode. |
| Tuesday | Product Hunt launch at 12:01 AM Pacific. All hands on upvotes and comments. |
| Wednesday | Hacker News Show HN post (9 AM US Eastern for best visibility). |
| Thursday | Dev.to primary article published. Cross-post to Hashnode. |
| Friday | Twitter thread with first earnings screenshot. Post to r/SideProject with week 1 numbers. |
| Saturday | Indie Hackers post with week 1 revenue transparency. |
| Sunday | Respond to all outstanding comments across all platforms. Review week 1 analytics. |

---

### First 90 Days Targets

| Metric | Month 1 | Month 2 | Month 3 |
|---|---|---|---|
| Developer installs | 150 | 400 | 700 |
| Daily active users (DAU) | 60 | 160 | 280 |
| Active advertiser campaigns | 3 | 8 | 15 |
| Average CPM achieved | $8 | $10 | $12 |
| Gross platform revenue | $200 | $800 | $2,000 |
| Developer payouts sent | $100 | $400 | $1,000 |
| Platform revenue (50%) | $100 | $400 | $1,000 |

---

### Key Metrics to Track

**Developer metrics:**
- Total installs (VS Code Marketplace)
- DAU / MAU ratio (target: 40%+ DAU/MAU)
- Impressions per developer per day (target: 20+ impressions/dev/day)
- 7-day and 30-day retention
- Churn rate (uninstalls / total installs)

**Advertiser metrics:**
- Active campaigns at any given time
- Average CPM achieved (track against $8–15 market)
- Fill rate (% of available impressions that were sold)
- Advertiser 30-day retention (did they re-buy?)
- Average campaign budget

**Revenue metrics:**
- Gross revenue (total advertiser spend)
- Platform revenue (50% of gross)
- Developer payouts (50% of gross)
- Average revenue per developer per month
- LTV by advertiser segment (Tier 1 vs Tier 2 vs Tier 3)

---

### Budget Allocation (Month 1–3)

| Item | Month 1 | Month 2 | Month 3 |
|---|---|---|---|
| Paid ads (Reddit, Twitter) | $0 | $200 | $400 |
| Newsletter sponsorship | $0 | $0 | $500 |
| Design / graphics | $50 | $0 | $100 |
| Domain / hosting | $20 | $20 | $20 |
| Tools (analytics, email) | $30 | $30 | $50 |
| **Total spend** | **$100** | **$250** | **$1,070** |

Keep Month 1 spend at zero paid ads. Organic validation first. Only spend on paid acquisition after you have proof that developers convert and stay (DAU/MAU above 35%).

---

## PART 5 — RISK MITIGATION

### Risk 1: No Advertisers Join in Month 1

**Early warning sign:** Fewer than 2 advertiser accounts created by end of week 2.

**Action plan:**
1. Personally cold email 10 DevRel managers at Tier 1 companies with a free trial offer: first 1,000 impressions at no cost.
2. Run a house ad (SpinEarn's own ad) in all unsold inventory — use it to cross-promote the advertiser self-serve page. "Your ad here → 10,000 developers waiting for Claude Code."
3. Reach out to BuySellAds immediately — let them sell the inventory for you in exchange for their commission.
4. Temporarily lower the floor price to generate first bidding activity and make the bid queue look active.

**Do not:** Fake impressions, fake bids, or misrepresent the audience size. This destroys trust permanently.

---

### Risk 2: Kickbacks.ai Dominates HN or Product Hunt on the Same Day

**Differentiation talking points (memorize these):**

1. "SpinEarn payouts are live. Kickbacks hasn't sent a payout yet as of June 2026." — this is factual and significant.
2. "SpinEarn uses zero CSP patching — it's safe for enterprise development environments. This is an architectural choice, not a feature addition."
3. "SpinEarn has a full PostgreSQL audit trail for every impression — verifiable to advertisers."
4. "SpinEarn fraud prevention: 50¢/hr cap and $5/day cap prevents gaming. Kickbacks' equivalent is unspecified."
5. "SpinEarn is open-source on the client side — you can audit what's running in your IDE."

If Kickbacks posts on HN on the same day: do not post Show HN that day. Wait 3–4 days and post when theirs has scrolled off. The two posts appearing simultaneously splits attention and both lose.

---

### Risk 3: Payout Delays

**Razorpay issue:** Razorpay's international payout via Wise can take 3–7 business days. If there are delays, communicate proactively.

**Trust-building alternatives if a payout is stuck:**
- Send a personal email from the founder to every developer waiting on a payout with the exact expected date and reason for delay.
- Publish a public payout status page (simple GitHub-hosted page showing "last payout batch: [date], next batch: [date]").
- Never let a payout stay pending more than 14 days without public communication — developer trust is your most fragile asset.
- If Razorpay causes consistent issues for international payments, add direct Wise business transfer as the primary global option.

---

### Risk 4: Low Developer Engagement (Low DAU/MAU)

**Early warning sign:** Less than 20% DAU/MAU at end of Month 1.

**Causes and fixes:**
- Developers installed but are not actively using Claude Code → target more active Claude Code users in acquisition.
- Extension is crashing or conflicting with other extensions → prioritize stability patches.
- Ads are too intrusive → reduce ad size or add a "minimize for 1 hour" option.
- Earnings are too low to motivate continued use → educate developers that earnings compound over time and are passive.

**Retention lever:** Email all installed developers monthly with their personal earnings statement — even if it's $0.47. Seeing a number, any number, reinforces that the extension is working passively.

---

## QUICK-START CHECKLIST (Open This Tomorrow)

- [ ] Secure Twitter handle and LinkedIn company page
- [ ] Submit to BetaList (1–3 week queue — do this today)
- [ ] Open-source the extension client on GitHub
- [ ] Write and schedule the Dev.to primary article
- [ ] Draft Product Hunt listing assets (5 screenshots, demo GIF, 300-word description)
- [ ] Recruit 20 beta developer users from your network
- [ ] Email 5 DevRel managers at Tier 1 advertisers with the cold outreach template above
- [ ] Set up Google Analytics 4 on spinearn.in with install-click and advertiser-signup events
- [ ] Create the public payout status page
- [ ] Confirm self-serve advertiser portal is functional with Razorpay and Wise flows

---

*Last updated: June 2026. Review and update monthly against actual metrics.*
