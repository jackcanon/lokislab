import { SkillMatrixLeaderboard } from '@/components/skillMatrixLeaderboard';
import {
  ArrowUpRight,
  Check,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { NewsTicker, type TickerStory } from '@/components/NewsTicker';
import {
  summary,
  top5,
  feedMeta,
} from '@/lib/skillMatrix';

// --- Trusted Sources: mixed feed of Loki's Lab articles + scraped external news ---

function scanLokiArticles(): {
  slug: string;
  title: string;
  date: string;
  href: string;
  pinned: boolean;
}[] {
  const draftsDir = path.join(process.cwd(), 'content', 'drafts');
  const parsed = fs
    .readdirSync(draftsDir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(draftsDir, file), 'utf-8');
      const fm = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';

      const shortTitle =
        fm.match(/^short_title:\s*"([^"]+)"/m)?.[1] ??
        fm.match(/^short_title:\s*(.+)$/m)?.[1]?.trim() ??
        null;

      const title =
        shortTitle ??
        fm.match(/^title:\s*"([^"]+)"/m)?.[1] ??
        fm.match(/^title:\s*(.+)$/m)?.[1]?.trim() ??
        file.replace(/\.md$/, '').replace(/^LL-\d+-/, '').replace(/-/g, ' ');

      const date =
        fm.match(/^date:\s*"([^"]+)"/m)?.[1] ??
        fm.match(/^date:\s*(.+)$/m)?.[1]?.trim() ??
        '';

      const pinMatch = fm.match(/^pin:\s*(true|"true"|"1"|1)/m);
      const pinned = pinMatch ? true : false;

      const slug = 'll-' + file.replace(/\.md$/, '').replace(/^LL-(\d+)-.*/, '$1');

      return {
        slug,
        title,
        date,
        href: `/articles/${file.replace(/\.md$/, '')}`,
        pinned,
      };
    });

  return parsed.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return b.title.localeCompare(a.title);
  });
}

interface ScrapedNewsItem {
  source: string;
  title: string;
  href: string;
  date: string;
  excerpt?: string;
}

function loadScrapedNews(): ScrapedNewsItem[] {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data', 'trusted-news.json'),
      'utf-8',
    );
    const parsed = JSON.parse(raw) as { items?: ScrapedNewsItem[] };
    return parsed.items ?? [];
  } catch {
    return [];
  }
}

const lokisArticles = scanLokiArticles();
const scrapedNews = loadScrapedNews();

// --- Build the cycling ticker story list: Loki articles + external trusted news ---

function buildTickerStories(): TickerStory[] {
  const out: TickerStory[] = [];

  // Loki's Lab articles first (most recent first)
  for (const a of lokisArticles) {
    out.push({ title: a.title, href: a.href, source: "Loki's Lab" });
  }

  // External trusted news, de-duplicated against Loki titles
  const lokiTitles = new Set(lokisArticles.map((a) => a.title.toLowerCase()));
  for (const n of scrapedNews) {
    if (!n.title || n.title.toLowerCase() in lokiTitles) continue;
    out.push({ title: n.title, href: n.href, source: n.source || 'Trusted wire' });
  }

  return out;
}

const tickerStories = buildTickerStories();

// --- Methods strip ---

const methods = [
  [
    'Fixed harness',
    'The same versioned Hermes profile and tool configuration for every comparable run.',
  ],
  [
    'Three runs',
    'Each task runs three times. We report the median and retain best, worst, and failures.',
  ],
  [
    'Public evidence',
    'Privacy-safe raw JSON, runner scripts, scoring rules, and moderation history stay inspectable.',
  ],
];

const submissionUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLSecRejUJw49OsKEBOmMKkr2ns4TKZwdeY5Jj3rVSKlU0Hq_3Q/viewform?usp=sharing&ouid=100725185419145806700';

// --- Best-right-now picks derived from the live skill-matrix feed ---

type BestPick = {
  label: string;
  model: string;
  machine: string;
  why: string;
  href: string;
};

function bestOverall(): BestPick | null {
  const candidates = summary
    .filter((s) => s.capable > 0 && s.avgQuality != null)
    .sort((a, b) => {
      if (b.avgQuality !== a.avgQuality) return (b.avgQuality ?? 0) - (a.avgQuality ?? 0);
      return (b.capableRate ?? 0) - (a.capableRate ?? 0);
    });
  const top = candidates[0];
  if (!top) return null;
  return {
    label: 'Best overall',
    model: top.model,
    machine: top.machine,
    why: `${top.capable}/${top.tests} capable tasks · avg quality ${top.avgQuality?.toFixed(1)}/`,
    href: '/test/results',
  };
}

function bestMac(): BestPick | null {
  const mac = summary.filter(
    (s) => s.machine && /mac|apple|m1|m2|m3|m4|m5|m6/i.test(s.machine),
  );
  const candidates = mac
    .filter((s) => s.capable > 0 && s.avgQuality != null)
    .sort((a, b) => {
      if (b.avgQuality !== a.avgQuality) return (b.avgQuality ?? 0) - (a.avgQuality ?? 0);
      return (b.capableRate ?? 0) - (a.capableRate ?? 0);
    });
  const top = candidates[0];
  if (!top) return null;
  return {
    label: 'Best Mac model',
    model: top.model,
    machine: top.machine,
    why: `Local AI on Apple Silicon · ${top.capable}/${top.tests} capable tasks`,
    href: '/test/results',
  };
}

function fastestUseful(): BestPick | null {
  const candidates = summary
    .filter((s) => s.capable > 0 && s.medianSpeedS != null && s.avgQuality != null)
    .sort((a, b) => {
      if (a.avgQuality !== b.avgQuality) return (b.avgQuality ?? 0) - (a.avgQuality ?? 0);
      return (a.medianSpeedS ?? Infinity) - (b.medianSpeedS ?? Infinity);
    });
  const top = candidates[0];
  if (!top) return null;
  return {
    label: 'Fastest useful',
    model: top.model,
    machine: top.machine,
    why: `${top.medianSpeedS?.toFixed(1)}s median · quality ${top.avgQuality?.toFixed(1)}/`,
    href: '/test/results',
  };
}

const homepagePicks = [bestOverall(), bestMac(), fastestUseful()].filter(
  (p): p is BestPick => p !== null,
);

export default async function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#ece5d8] text-[#17201f]">
      {/* Top wire — cycling ticker: one story at a time */}
      <div
        id="top"
        className="border-b border-[#aaa194] bg-[#17201f] text-[#e9e4db]"
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center px-5 py-2.5 md:px-10 lg:px-14">
          <span className="shrink-0 text-[#e2734c] font-semibold uppercase tracking-[0.16em] text-[11px] md:hidden">
            News
          </span>
          <div className="flex-1 overflow-hidden">
            <NewsTicker stories={tickerStories} />
          </div>
          <span className="ml-auto shrink-0 text-[#aeb6b2] text-[11px] font-semibold uppercase tracking-[0.16em] hidden sm:block">
            Signal, not noise
          </span>
        </div>
      </div>

      {/* Results lead — headline + best picks strip */}
      <section
        id="leaderboard"
        className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 lg:py-18"
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#b74627]">
              The Agent Leaderboard
            </p>
            <h1 className="display-serif max-w-3xl text-[clamp(3rem,7vw,6rem)] leading-[1] tracking-[-0.05em]">
              What can your machine run?
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-7 text-[#4c5652]">
              Reproducible agent benchmarks, useful setup guides, and AI news for builders who
              would rather test the claim than repeat it.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/test/results"
                className="rounded-full border border-[#aca396] px-5 py-2.5 text-sm font-semibold transition hover:border-[#17201f]"
              >
                See all results →
              </Link>
              <Link
                href="/news"
                className="rounded-full border border-[#aaa194] px-5 py-2.5 text-sm font-semibold text-[#5b6560] transition hover:border-[#17201f] hover:text-[#17201f]"
              >
                See all news
              </Link>
              <Link
                href="/test"
                className="rounded-full bg-[#b74627] px-5 py-2.5 text-sm font-bold text-[#ece5d8] transition hover:bg-[#a5341a]"
              >
                Run the test yourself
              </Link>
            </div>
          </div>
          <div className="shrink-0 text-right text-sm text-[#6e7773]">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2d6953]">
              Live · {feedMeta.totalRuns} eval runs
            </p>
            <p className="mt-1 text-xs text-[#8f9a95]">
              Updated from the fleet skill-matrix feed.
            </p>
          </div>
        </div>

        {/* Best right now strip */}
        {homepagePicks.length > 0 && (
          <div className="mt-10 rounded-xl border border-[#b74627] bg-[#f7f3eb] px-5 py-6 md:px-8">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#b74627]">
              Best right now
              <span className="text-[#8a6a1f]">·</span>
              <span className="text-[#5b4a1f]">from the latest runs</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {homepagePicks.map((pick) => (
                <Link
                  key={pick.label + pick.model}
                  href={pick.href}
                  className="group flex flex-col gap-2 rounded-lg bg-white/50 p-4 transition hover:bg-white/80"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#b74627]">
                    {pick.label}
                  </span>
                  <span className="font-mono text-base font-bold text-[#17201f]">
                    {pick.model}
                  </span>
                  <span className="text-xs text-[#6e7773]">{pick.machine}</span>
                  {pick.why && (
                    <span className="text-xs text-[#6e7773] leading-relaxed">{pick.why}</span>
                  )}
                  <span className="text-xs text-[#8f9a95]">
                    See the result →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Leaderboard — the full ranked table */}
      <SkillMatrixLeaderboard />

      {/* Methodology */}
      <section
        id="method"
        className="mx-auto max-w-[1440px] px-5 py-16 md:px-10 lg:px-14 lg:py-24"
      >
        <div className="grid gap-10 lg:grid-cols-[0.85fr_2fr]">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#b74627]">
              Methodology
            </p>
            <h2 className="display-serif text-5xl leading-[0.95] tracking-[-0.04em]">
              The test is the test.
            </h2>
            <p className="mt-6 max-w-sm leading-7 text-[#53605b]">
              Sponsors can fund hardware or segments. They cannot purchase a score, placement, or
              conclusion.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[#aaa194] bg-[#aaa194] md:grid-cols-3">
            {methods.map(([title, body], index) => (
              <article key={title} className="bg-[#f7f3eb] p-7">
                <span className="display-serif text-5xl text-[#b8afa2]">
                  0{index + 1}
                </span>
                <h3 className="mt-10 text-lg font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6560]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Community testing */}
      <section
        id="submit"
        className="bg-[#17201f] text-[#e9e4db]"
      >
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-14 lg:py-20">
          <div>
            <FlaskConical className="mb-8 h-10 w-10 text-[#e2734c]" />
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#e2734c]">
              Community testing
            </p>
            <h2 className="display-serif max-w-4xl text-5xl leading-[0.95] tracking-[-0.04em] md:text-7xl">
              Run it. Inspect it. Send the evidence.
            </h2>
          </div>
          <div className="flex flex-col justify-end">
            <p className="mb-7 text-lg leading-7 text-[#bac1bd]">
              The public runner will support macOS, Linux, Windows PowerShell, and WSL. Every
              submission receives a unique ID and a visible verification status.
            </p>
            <div className="space-y-3 text-sm">
              {[
                'Standard JSON schema',
                'Privacy-safe raw output',
                'Verified, unverified, or under review',
              ].map((item) => (
                <p key={item} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-[#e2734c]" /> {item}
                </p>
              ))}
            </div>
            <a
              href={submissionUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#e2734c] px-6 py-3 text-sm font-black text-[#17201f] transition hover:bg-[#f08a65]"
            >
              Submit a benchmark result{' '}
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <p className="mt-3 text-xs text-[#8f9a95]">
              Google sign-in is required for verified email and secure JSON upload.
            </p>
          </div>
        </div>
      </section>

      {/* 101 */}
      <section
        id="learn"
        className="mx-auto max-w-[1440px] px-5 py-16 md:px-10 lg:px-14 lg:py-24"
      >
        <div className="mb-10 flex flex-col justify-between gap-4 border-b-2 border-[#17201f] pb-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#b74627]">
              Loki&apos;s Lab 101
            </p>
            <h2 className="display-serif text-5xl tracking-[-0.04em]">
              Useful from the first command.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#59645f]">
            Free, practical courses for local models and agents—without a paywall.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['01', 'Choose the right local model', 'Match memory, hardware, context, and workload before downloading.'],
            ['02', 'Set up Ollama + Hermes', 'Build a clean, repeatable first local agent environment.'],
            ['03', 'Read a benchmark honestly', 'Understand coverage, speed, failures, and what one score leaves out.'],
          ].map(([number, title, copy]) => (
            <article
              key={number}
              className="min-h-64 border border-[#aaa194] bg-[#f7f3eb] p-7"
            >
              <span className="font-mono text-xs font-bold text-[#b74627]">
                {number} / COMING NEXT
              </span>
              <h3 className="display-serif mt-14 text-3xl leading-8">{title}</h3>
              <p className="mt-4 text-sm leading-6 text-[#5d6762]">{copy}</p>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
