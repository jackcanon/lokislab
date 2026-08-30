import { Leaderboard } from '@/components/leaderboard';
import { getLeaderboardData } from '@/lib/leaderboard';
import {
  ArrowUpRight,
  Check,
  FlaskConical,
  Menu,
  ShieldCheck,
} from 'lucide-react';

const trustedNews = [
  {
    source: 'LM Studio',
    date: 'Aug 27',
    title: 'How Auto Review works in Bionic',
    href: 'https://lmstudio.ai/blog/how-auto-review-works',
  },
  {
    source: 'LM Studio',
    date: 'Aug 17',
    title: 'Bionic now supports skills',
    href: 'https://lmstudio.ai/blog/skills',
  },
  {
    source: 'llama.cpp',
    date: 'Aug 20',
    title: 'Release b10516 lands for local inference',
    href: 'https://github.com/ggml-org/llama.cpp/releases/tag/b10516',
  },
  {
    source: 'Hermes Agent',
    date: 'Jul 8',
    title: 'Version 0.18.2 is now available',
    href: 'https://github.com/NousResearch/hermes-agent/releases/tag/v2026.7.7.2',
  },
];

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

export default async function Home() {
  const leaderboard = await getLeaderboardData();

  return (
    <main className="min-h-screen overflow-hidden bg-[#ece5d8] text-[#17201f]">
      <header className="sticky top-0 z-50 border-b border-[#aaa194] bg-[#ece5d8]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-10 lg:px-14">
          <a
            href="#top"
            className="flex items-center gap-3"
            aria-label="Loki's Lab home"
          >
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-sm bg-[#17201f] text-[#ece5d8]">
              <span className="absolute left-[8px] top-[2px] -rotate-12 font-serif text-2xl font-black">
                L
              </span>
              <span className="absolute bottom-[1px] right-[7px] rotate-[168deg] font-serif text-2xl font-black text-[#d26743]">
                L
              </span>
            </span>
            <span className="display-serif text-xl font-bold tracking-tight">
              Loki’s Lab
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <a href="#leaderboard" className="hover:text-[#b74627]">
              Leaderboard
            </a>
            <a href="#news" className="hover:text-[#b74627]">
              News
            </a>
            <a href="#method" className="hover:text-[#b74627]">
              Method
            </a>
            <a href="#learn" className="hover:text-[#b74627]">
              101
            </a>
          </nav>
          <a
            href={submissionUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full bg-[#17201f] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#b74627] sm:block"
          >
            Submit a result
          </a>
          <Menu className="md:hidden" aria-label="Menu" />
        </div>
      </header>

      <div
        id="top"
        className="border-b border-[#aaa194] bg-[#17201f] text-[#e9e4db]"
      >
        <div className="mx-auto flex max-w-[1440px] items-center gap-5 overflow-hidden px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] md:px-10 lg:px-14">
          <span className="shrink-0 text-[#e2734c]">Trusted wire</span>
          <span className="truncate">
            LM Studio explains Bionic Auto Review
          </span>
          <span className="text-[#6e7773]">◆</span>
          <span className="hidden truncate md:inline">
            New llama.cpp release
          </span>
          <span className="ml-auto shrink-0 text-[#aeb6b2]">
            Signal, not noise
          </span>
        </div>
      </div>

      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 md:px-10 lg:grid-cols-[minmax(0,1.55fr)_420px] lg:px-14 lg:py-20">
        <div className="flex min-h-[480px] flex-col justify-between border-l-4 border-[#b74627] pl-6 md:pl-10">
          <div>
            <p className="mb-6 text-xs font-bold uppercase tracking-[0.22em] text-[#8e4d31]">
              Independent local AI fieldwork
            </p>
            <h1 className="display-serif max-w-5xl text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.86] tracking-[-0.065em]">
              Which local model earns a place on your machine?
            </h1>
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-6 border-t border-[#aaa194] pt-6 md:flex-row md:items-end">
            <p className="max-w-2xl text-lg leading-7 text-[#4c5652]">
              Reproducible agent benchmarks, useful setup guides, and AI news
              for builders who would rather test the claim than repeat it.
            </p>
            <a
              href="#leaderboard"
              className="group flex shrink-0 items-center gap-2 font-bold text-[#b74627]"
            >
              See the results{' '}
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
            </a>
          </div>
        </div>

        <aside id="news" className="border-t-4 border-[#17201f]">
          <div className="flex items-center justify-between py-4">
            <h2 className="text-xs font-black uppercase tracking-[0.18em]">
              Trusted sources
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#2d6953]">
              <ShieldCheck className="h-3.5 w-3.5" /> Curated feed
            </span>
          </div>
          {trustedNews.map((story) => (
            <a
              key={story.href}
              href={story.href}
              target="_blank"
              rel="noreferrer"
              className="group grid grid-cols-[92px_1fr_20px] gap-3 border-t border-[#aaa194] py-5"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#707873]">
                <p className="text-[#b74627]">{story.source}</p>
                <p className="mt-1">{story.date}</p>
              </div>
              <h3 className="display-serif text-xl leading-6 group-hover:text-[#b74627]">
                {story.title}
              </h3>
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ))}
          <p className="border-t border-[#aaa194] pt-4 text-xs leading-5 text-[#69706c]">
            Official project feeds and sources selected by the editor. Open-net
            discovery will remain a separate, clearly labeled stream.
          </p>
        </aside>
      </section>

      <Leaderboard {...leaderboard} />

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
              Sponsors can fund hardware or segments. They cannot purchase a
              score, placement, or conclusion.
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

      <section id="submit" className="bg-[#17201f] text-[#e9e4db]">
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
              The public runner will support macOS, Linux, Windows PowerShell,
              and WSL. Every submission receives a unique ID and a visible
              verification status.
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
              Submit a benchmark result <ArrowUpRight className="h-4 w-4" />
            </a>
            <p className="mt-3 text-xs text-[#8f9a95]">
              Google sign-in is required for verified email and secure JSON
              upload.
            </p>
          </div>
        </div>
      </section>

      <section
        id="learn"
        className="mx-auto max-w-[1440px] px-5 py-16 md:px-10 lg:px-14 lg:py-24"
      >
        <div className="mb-10 flex flex-col justify-between gap-4 border-b-2 border-[#17201f] pb-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#b74627]">
              Loki’s Lab 101
            </p>
            <h2 className="display-serif text-5xl tracking-[-0.04em]">
              Useful from the first command.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#59645f]">
            Free, practical courses for local models and agents—without a
            paywall.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [
              '01',
              'Choose the right local model',
              'Match memory, hardware, context, and workload before downloading.',
            ],
            [
              '02',
              'Set up Ollama + Hermes',
              'Build a clean, repeatable first local agent environment.',
            ],
            [
              '03',
              'Read a benchmark honestly',
              'Understand coverage, speed, failures, and what one score leaves out.',
            ],
          ].map(([number, title, copy]) => (
            <article
              key={number}
              className="min-h-64 border border-[#aaa194] bg-[#f7f3eb] p-7"
            >
              <span className="font-mono text-xs font-bold text-[#b74627]">
                {number} / COMING NEXT
              </span>
              <h3 className="display-serif mt-14 text-3xl leading-8">
                {title}
              </h3>
              <p className="mt-4 text-sm leading-6 text-[#5d6762]">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#aaa194] bg-[#dcd6cb]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 md:grid-cols-[1fr_2fr] md:px-10 lg:px-14">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              Open Net
            </p>
            <p className="mt-2 text-sm text-[#616965]">
              Broader discovery, kept separate from trusted sources.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-dashed border-[#9f968a] p-5 text-sm text-[#626a66]">
              Discovery feed and source filters are coming after launch.
            </div>
            <div className="rounded-lg border border-dashed border-[#9f968a] p-5 text-sm text-[#626a66]">
              Lab Notes will add original reactions, tests, and field reports.
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#ece5d8]">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 px-5 py-10 text-sm md:flex-row md:items-end md:px-10 lg:px-14">
          <div>
            <p className="display-serif text-2xl font-bold">Loki’s Lab</p>
            <p className="mt-2 text-[#626a66]">Gain meaning, not AI noise.</p>
          </div>
          <div className="text-right text-xs leading-5 text-[#626a66]">
            <p>Independent testing · Public methodology · Community evidence</p>
            <p>
              Discord, newsletter, and support links are coming with public
              beta.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
