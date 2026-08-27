export interface BlogSeed {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  excerpt: string;
  content: string;
  status: 'draft' | 'published';
}

export const BLOG_SEEDS: BlogSeed[] = [
  {
    title: 'Bitcoin Halving Explained: Why Four Years Matter',
    slug: 'bitcoin-halving-explained',
    category: 'Bitcoin',
    tags: ['bitcoin', 'halving', 'mining', 'supply'],
    excerpt: 'Every four years Bitcoin cuts block rewards in half. Here is how the halving works, why it matters for supply, and what history says about price cycles.',
    status: 'published',
    content: `## What is the halving?

Every 210,000 blocks — roughly four years — the Bitcoin network automatically cuts the block reward paid to miners in half. When Bitcoin launched in 2009 miners received **50 BTC** per block. Today, after four halvings, the reward stands at just **3.125 BTC**.

## Why does it exist?

Satoshi Nakamoto designed the halving as a monetary policy instrument. Unlike fiat currencies, whose supply is decided by central banks, Bitcoin's issuance schedule is written into code and is perfectly predictable. There will only ever be **21 million BTC**, and the halving is the mechanism that paces the release of that supply over roughly 130 years.

## Supply shock mechanics

- Miners sell most of their rewards to cover electricity and hardware costs.
- Each halving instantly removes that selling pressure by 50%.
- If demand stays constant while new supply falls, price equilibrium shifts upward.

Economists sometimes describe this as a **supply shock**. Critics counter that the event is known years in advance and therefore priced in. Historically, both things have been partially true.

## What history shows

| Halving | Date | Price at halving | Cycle peak (~1 yr later) |
|---------|------|------------------|--------------------------|
| 1st | Nov 2012 | ~$12 | ~$1,150 |
| 2nd | Jul 2016 | ~$650 | ~$19,700 |
| 3rd | May 2020 | ~$8,700 | ~$69,000 |
| 4th | Apr 2024 | ~$64,000 | ? |

Past performance is not a promise, but the pattern of post-halving rallies has become one of the most watched narratives in the industry.

## What to watch next cycle

1. **Hashrate resilience** — whether miners can stay profitable with lower rewards.
2. **ETF flows** — institutional vehicles now absorb supply faster than miners produce it.
3. **Macro liquidity** — rate cycles increasingly drive risk assets, Bitcoin included.

## Conclusion

The halving is not magic — it is simple, predictable arithmetic. But it encodes Bitcoin's core promise: sound, unchangeable monetary policy. Whether or not each cycle repeats, the halving remains the heartbeat of the Bitcoin economy.`,
  },
  {
    title: 'Ethereum Staking 101: Earning Yield on ETH',
    slug: 'ethereum-staking-101',
    category: 'Ethereum',
    tags: ['ethereum', 'staking', 'pos', 'yield'],
    excerpt: 'Since the Merge, Ethereum runs on proof-of-stake. Learn how staking works, what yield to expect, and the trade-offs between solo staking, pools, and liquid staking tokens.',
    status: 'published',
    content: `## From proof-of-work to proof-of-stake

In September 2022, **the Merge** switched Ethereum from energy-intensive proof-of-work to proof-of-stake, cutting its energy consumption by ~99.95%. Today, validators secure the network by locking up 32 ETH and attesting to new blocks.

## How yields are generated

Stakers earn:

- **Consensus rewards** — newly issued ETH for attesting and proposing blocks.
- **Execution rewards** — a share of transaction fees and MEV from each block.

Combined, this has historically produced roughly **3–5% annual yield**, denominated in ETH.

## Your three main options

### 1. Solo staking
Run your own validator with 32 ETH. Maximum rewards, full self-custody, and you strengthen network decentralization. The catch: hardware, uptime, and key-management responsibility.

### 2. Staking pools and exchanges
Delegate any amount through centralized services. Simple, liquid, but custodial — you trust the operator, and regulators have started treating some pooled products as securities.

### 3. Liquid staking tokens (LSTs)
Protocols like Lido and Rocket Pool issue tradable tokens (stETH, rETH) that accrue staking yield while staying usable across DeFi. Convenient — but you take on smart-contract and depeg risk.

## Risks to understand

- **Slashing** — validators that misbehave can lose part of their stake.
- **Lockups** — withdrawals are queued; LSTs can trade below peg in panics.
- **Tax** — in many jurisdictions staking rewards are taxable income. Track everything.

## Bottom line

Staking turned ETH into a productive asset. Pick the option that matches your custody appetite: solo for purists, pools for convenience, LSTs for DeFi power users.`,
  },
  {
    title: 'DeFi Yield Farming: A Beginner\'s Guide',
    slug: 'defi-yield-farming-guide',
    category: 'DeFi',
    tags: ['defi', 'yield', 'liquidity', 'amm'],
    excerpt: 'Yield farming lets you put idle crypto to work in DeFi protocols. We break down where the yields come from, how to evaluate risk, and classic beginner mistakes.',
    status: 'published',
    content: `## What is yield farming?

Yield farming means depositing crypto into decentralized protocols in exchange for rewards — trading fees, governance tokens, or interest. It is the engine room of DeFi.

## Where the yield actually comes from

1. **Swap fees** — automated market makers (AMMs) like Uniswap share 0.01–1% fees with liquidity providers.
2. **Lending interest** — lending markets match lenders with leveraged borrowers.
3. **Token incentives** — protocols bootstrap liquidity by paying out their governance token.
4. **Real-world yield** — tokenized treasuries and stablecoin loans to institutions.

If you cannot identify the source of a yield, assume it is you.

## Key metrics

- **APY vs APR** — APY compounds; APR does not. Compare like with like.
- **TVL** — total value locked indicates scale and liquidity depth.
- **Impermanent loss** — the cost of providing two-sided liquidity when prices diverge.

## A simple risk ladder

| Risk | Strategy |
|------|----------|
| Lower | Blue-chip lending (Aave) with stablecoins |
| Medium | Established AMM pools with incentives |
| Higher | New protocol launch pools, leveraged looping |

## Beginner mistakes to avoid

- Chasing three-digit APYs that decay within days.
- Ignoring gas costs on small positions.
- Forgetting that incentive tokens can dump faster than you farm them.
- Skipping contract-risk research — use DefiSafety, audits, and timelock checks.

## Start small, verify everything

Farming is a skill. Deposit a small test amount, track your P&L including the value of earned tokens, and scale only once the numbers make sense.`,
  },
  {
    title: 'Cold Wallets vs Hot Wallets: Securing Your Crypto',
    slug: 'cold-vs-hot-wallets',
    category: 'Security',
    tags: ['security', 'wallets', 'self-custody', 'seed-phrase'],
    excerpt: 'Not your keys, not your coins. A practical guide to cold storage, hot wallets, multisig, and the habits that keep attackers out.',
    status: 'published',
    content: `## The golden rule

**Not your keys, not your coins.** When crypto sits on an exchange, you hold an IOU. Self-custody means you — and only you — control the private keys.

## Hot wallets: convenience first

Hot wallets are connected to the internet: browser wallets like **MetaMask**, mobile wallets, and exchange accounts.

- ✅ Instant transactions, easy dApp access
- ❌ Exposed to phishing, malicious approvals, malware

Treat a hot wallet like the cash in your pocket: convenient capital, capped at what you can afford to lose.

## Cold wallets: security first

Cold wallets keep keys on an offline device — hardware wallets like Ledger or Trezor, or even a properly created steel backup.

- ✅ Private keys never touch the internet
- ❌ Slower to use, and a lost seed phrase means lost funds

## Habits that prevent 95% of losses

1. Write the seed phrase on paper or steel. Never photograph it or store it in a cloud note.
2. Use a passphrase (25th word) for a hidden wallet.
3. Revoke old token approvals regularly.
4. Verify addresses and domains — bookmark sites, never follow ads.
5. Consider a **quarantine wallet** for minting and experiments.

## Multisig and inheritance

For larger sums, use a multisig (e.g. 2-of-3 with Safe) so one lost key does not mean catastrophe, and document a recovery plan for your heirs. Self-custody is freedom — with responsibility.`,
  },
  {
    title: 'Reading Candlestick Charts Like a Trader',
    slug: 'reading-candlestick-charts',
    category: 'Guides',
    tags: ['trading', 'technical-analysis', 'charts'],
    excerpt: 'Candles compress price action into four numbers. Learn anatomy, the patterns that matter, and how to pair candlesticks with volume and trend context.',
    status: 'published',
    content: `## Anatomy of a candle

Each candle shows four prices for a period — open, high, low, close:

- **Body** — the range between open and close.
- **Wicks** — how far price traveled and got rejected.

Green candles closed higher than they opened; red ones closed lower.

## Patterns that carry weight

### Doji
Open ≈ close. Indecision. Useful at the end of extended moves.

### Hammer / shooting star
Long lower wick after a downtrend = potential reversal up (hammer). Its mirror after an uptrend = exhaustion (shooting star).

### Engulfing candles
A candle whose body fully swallows the previous one signals momentum shift — bullish engulfing at support, bearish engulfing at resistance.

## Context beats patterns

A candle is only a sentence; **structure is the paragraph**:

1. **Trend** — higher highs and higher lows, or the opposite? 
2. **Levels** — prior swing highs/lows, round numbers, volume profile nodes.
3. **Volume** — breakouts on rising volume are credible; on falling volume, suspect.
4. **Timeframe alignment** — a 4h bearish engulfing inside a weekly uptrend is noise to many traders.

## A simple starter framework

- Mark the last 3 swing highs and lows on the daily chart.
- Wait for price to reach one.
- Look for a rejection candle **with** volume confirmation.
- Define invalidation before entering, not after.

## Final word

Candlesticks do not predict — they describe. Combine them with discipline, position sizing, and journaling, and you have the beginnings of a process.`,
  },
  {
    title: 'Top Altcoin Narratives to Watch This Cycle',
    slug: 'altcoin-narratives-to-watch',
    category: 'Altcoins',
    tags: ['altcoins', 'research', 'narratives'],
    excerpt: 'From AI agents to restaking and real-world assets, capital rotates through narratives. A field guide to the biggest themes — and how to separate substance from spin.',
    status: 'published',
    content: `## Narratives move markets

Crypto markets are narrative machines. Identifying a narrative early — and knowing when it is crowded — matters as much as fundamental analysis.

## The major themes

### 1. AI x Crypto
Agents that hold wallets, pay for compute, and coordinate autonomously. Watch: inference networks, data markets, agent frameworks.

### 2. Restaking and yield infrastructure
EigenLayer-style restaking recycles Ethereum's security to new services. Powerful idea, complex risk stack.

### 3. Real-world assets (RWA)
Tokenized treasuries and funds are the fastest-growing slice of institutional crypto. Boring yields, massive flows.

### 4. Modular blockchains
Execution, settlement, and data availability are unbundling. Celestia, rollups, and shared-sequencing designs compete to be picks and shovels.

### 5. DePIN
Decentralized physical infrastructure — wireless, mapping, GPU grids — that pays participants in tokens.

### 6. Bitcoin DeFi
Wrapped BTC liquidity, BitVM-style trusts, and Babylon staking are reawakening the oldest chain's economy.

## How to evaluate a narrative play

- **Is there real usage** (fees, users, revenue) or only a story?
- **Who is the buyer?** Retail hype cycles and institutional adoption curves look very different.
- **Token unlock schedule** — low-float/high-FDV launches often bleed for years.
- **Your edge** — if you heard about it from a stranger, ask who is selling.

## Bottom line

Trade narratives with a plan, size positions like they can go to zero, and rotate profits into what survives the cycle.`,
  },
  {
    title: 'Crypto Regulation in 2026: The Global Picture',
    slug: 'crypto-regulation-2026',
    category: 'Regulation',
    tags: ['regulation', 'compliance', 'global'],
    excerpt: 'Markets in Crypto-Assets rules in the EU, evolving SEC policy in the US, and tightening rules in Asia — a map of where global crypto regulation stands and where it is heading.',
    status: 'published',
    content: `## Why regulation now defines the industry

The era of anything-goes crypto is over. Institutional adoption dragged the industry into the regulatory perimeter, and 2025–2026 is delivering the rulebook.

## Europe: MiCA in force

The EU's **Markets in Crypto-Assets (MiCA)** framework fully applies across all member states:

- Stablecoin issuers need e-money or asset-referenced licenses and reserve disclosures.
- CASPs (crypto-asset service providers) face capital, custody, and travel-rule requirements.
- A single EU license passports services across 27 countries.

## United States: from enforcement to legislation

After years of regulation-by-enforcement, the US is converging on:

- Market-structure legislation splitting oversight of tokens between the SEC and CFTC.
- Stablecoin bills requiring 1:1 high-quality reserves.
- Approval pathways that opened the door to spot ETFs for major assets.

## Asia: pragmatic tightening

- **Singapore** licenses exchanges but bans retail margin hype.
- **Hong Kong** re-opened to licensed exchanges and spot ETFs.
- **Japan** maintains strict exchange custody rules and progressive taxation debates.

## What it means for you

1. **KYC is universal** — anonymous on-ramps are disappearing.
2. **Tax reporting is automating** — exchanges share data with tax authorities (DAC8, 1099-DA).
3. **Self-custody remains legal** nearly everywhere — regulation targets services, not keys.

## Outlook

Regulation is not the death of crypto's ethos; it is the price of scale. The projects that treat compliance as a feature — not a bug — will capture the institutional wave.`,
  },
  {
    title: 'GPU Mining in the AI Era: Still Profitable?',
    slug: 'gpu-mining-in-the-ai-era',
    category: 'Mining',
    tags: ['mining', 'gpu', 'ai', 'profitability'],
    excerpt: 'AI datacenters are hoovering up GPUs and paying above crypto-market rates for compute. We examine whether GPU mining still makes sense — and how miners are pivoting.',
    status: 'published',
    content: `## The new competition

The graphics cards miners once fought over at retail are now being bought by AI companies in container-load quantities. When an inference startup will pay a datacenter premium for an A100 or even a gaming-class GPU, the mining ROI equation changes.

## Where GPU mining still works

- **Post-Ethereum-merge reality**: Ethereum GPU mining is gone; remaining GPU-mineable coins (Kaspa, Ravencoin, Flux) are far smaller markets.
- **Cheap or free electricity** remains the decisive input.
- **Used-GPU arbitrage**: buying post-AI-deployment surplus cards below market can reset the math.

## The pivot: mining to compute

Many former mining farms are rebranding as **distributed compute providers**:

1. Rendering (Render, io.net style networks)
2. AI inference and fine-tuning at the edge
3. Video transcoding and CDN services

The rack, the power contract, and the cooling are the same — only the customer changed.

## Bitcoin mining's structural edge

ASIC-based Bitcoin mining remains a distinct industry with:

- Fixed-function hardware (no AI competition)
- Hashprice derivatives and hosted power deals
- A growing overlap with energy grids and flare-gas projects

## A quick sanity checklist

- What is your all-in cost per kWh, including cooling?
- What is payback time at *current* network difficulty, not launch hype?
- Can the hardware be repurposed if the coin dies?
- Have you modeled the tax treatment of mined rewards?

## Verdict

GPU *mining* is increasingly niche; GPU *hosting* is booming. The winners of this era own power infrastructure and stay flexible about whose workload runs on it.`,
  },
];
