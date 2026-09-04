import Link from 'next/link';
import { top5 } from '@/lib/skillMatrix';

type Tier = 'small' | 'medium' | 'large' | 'unknown';

function tierFor(model: string): Tier {
  const m = model.toLowerCase();

  if (
    /1b|1\.5b|3b|3\.5b|4b|5b|7b|8b|1b-/i.test(m) ||
    /gemma3:1b|gemma3:4b|gemma:2b|gemma2:2b|llama3\.2:1b|llama3\.2:3b|llama3\.2:3b-it|llama3\.1:8b|llama3:8b|llama2:7b|phi-?3\.5|phi-?3|qwq|qwen3\.5:4b/i.test(m)
  ) {
    return 'small';
  }

  if (
    /32b|34b|72b|120b|122b|30b|33b|35b|65b|70b|175b|176b|200b|341b|405b|406b|562b|1t|100b|v150|claude-opus|claude-sonnet-4|claude-sonnet-5|gpt-?4|o1|o3|gemini-2\.5-pro|gemini-2\.5-flash|grok-4/i.test(m)
  ) {
    return 'large';
  }

  if (
    /9b|14b|15b|20b|22b|24b|27b|30b|14b-/i.test(m) ||
    /gemma3:8b|gemma3:12b|gemma:7b|gemma2:9b|gemma2:27b|llama3\.1:14b|llama3\.1:16b|llama3\.1:405b/i.test(m) ||
    /mistral-large|mistral-medium|ministral|command-r|dbrx|starcoder2|mixtral|openhermes|open-mixtral|allganimals|qwen3\.[56]|qwen3\.8/i.test(m)
  ) {
    return 'medium';
  }

  return 'unknown';
}

function tierLabel(tier: Tier): string {
  return {
    small: 'tiny',
    medium: 'medium',
    large: 'large',
    unknown: 'tier?',
  }[tier];
}

function tierClass(tier: Tier): string {
  return {
    small: 'bg-[#2d6953] text-[#e9e4db]',
    medium: 'bg-[#9c6b2d] text-[#e9e4db]',
    large: 'bg-[#b74627] text-[#e9e4db]',
    unknown: 'bg-[#8a8175] text-[#e9e4db]',
  }[tier];
}

function machineDisplayName(machine: string | null | undefined): string {
  if (!machine) return '—';
  
  const m = machine.toLowerCase();
  
  // Map internal machine names to user-friendly hardware descriptions
  const machineMap: { [key: string]: string } = {
    // Macs
    'overgaard': 'Mac Studio M4 Max',
    'midgaard': 'Intel iMac',
    'm2pro': 'Mac mini M2 Pro',
    'odin': 'Mac mini M2 Pro',
    'asgard': 'Mac mini M2 Pro',
    'm1pro': 'MacBook Pro M1',
    'vanaheim': 'Mac mini M1',
    // Linux
    'heimdall': 'Linux RTX 4070',
    // Windows
    'windows': 'Windows GPU',
  };
  
  // Direct lookup
  if (machineMap[m]) {
    return machineMap[m];
  }
  
  // Pattern matching for other machines
  if (/overgaard/i.test(m)) return 'Mac Studio M4 Max';
  if (/midgaard/i.test(m)) return 'Intel iMac';
  if (/m2pro/i.test(m)) return 'Mac mini M2 Pro';
  if (/odin/i.test(m)) return 'Mac mini M2 Pro';
  if (/asgard/i.test(m)) return 'Mac mini M2 Pro';
  if (/m1pro/i.test(m)) return 'MacBook Pro M1';
  if (/vanaheim/i.test(m)) return 'Mac mini M1';
  if (/heimdall/i.test(m)) return 'Linux RTX 4070';
  
  // Fallback: capitalize first letter
  return machine.charAt(0).toUpperCase() + machine.slice(1);
}

function scoreOf(row: (typeof top5)[number]): number {
  const q = row.avgQuality ?? 0; // 0..5
  const cap = row.capableRate ?? 0; // 0..1
  return Math.round((q / 5) * 60 + cap * 40);
}

export function SkillMatrixLeaderboard() {
  const rows = top5.slice(0, 5);
  const macRows = rows.filter(
    (row) => row.machine && /mac|apple|m1|m2|m3|m4|m5|m6/i.test(row.machine),
  );

  return (
    <section id="leaderboard" className="border-y border-[#a9a093] bg-[#f7f3eb]">
      <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 lg:px-14">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#b74627]">
              The Agent Leaderboard
            </p>
            <h2 className="display-serif max-w-3xl text-4xl leading-[1.03] tracking-[-0.035em] md:text-6xl">
              Local models, judged by the work.
            </h2>
          </div>
          <div className="text-sm md:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2d6953]">
              Live · {top5.length} rows shown · top 5 by quality
            </p>
            <Link
              href="/test/results"
              className="mt-2 inline-block rounded-full border border-[#aca396] px-4 py-2 font-semibold transition hover:border-[#17201f]"
            >
              See all results →
            </Link>
          </div>
        </div>

        {/* Tier legend */}
        <div className="mb-6 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.12em]">
          <span className="text-[#69706c]">Tier:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2d6953]"></span>
            Tiny — 1B–8B class
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#9c6b2d]"></span>
            Medium — 14B–30B class
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#b74627]"></span>
            Large — 32B+ class
          </span>
          {macRows.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[#b74627]">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Mac rows: {macRows.length}
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#aaa194] bg-white">
          <div className="hidden grid-cols-[52px_1.55fr_1fr_0.9fr_0.65fr_0.65fr] gap-4 border-b border-[#d1cbc1] bg-[#e8e4dc] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5c625f] md:grid">
            <span>Rank</span>
            <span>Model</span>
            <span>System</span>
            <span>Coverage</span>
            <span>Median</span>
            <span>Score</span>
          </div>
          {rows.map((row, index) => {
            const tier = tierFor(row.model);
            const isMac =
              row.machine && /mac|apple|m1|m2|m3|m4|m5|m6/i.test(row.machine);
            return (
              <article
                key={`${row.model}@${row.machine}`}
                className={`grid gap-3 border-b border-[#ddd7ce] px-5 py-5 last:border-0 md:grid-cols-[52px_1.55fr_1fr_0.9fr_0.65fr_0.65fr] md:items-center md:gap-4 ${
                  isMac ? 'bg-[#faf6ef]' : ''
                }`}
              >
                <span className="display-serif text-3xl text-[#8a8175]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-sm font-bold md:text-base">
                      {row.model || 'unlabeled'}
                    </h3>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierClass(tier)}`}
                    >
                      {tierLabel(tier)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#68706c]">
                    fleet-skill-matrix v2 · auto-scored
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">{machineDisplayName(row.machine)}</p>
                  <p className="text-xs text-[#68706c]">local inference</p>
                  {isMac && (
                    <span className="mt-1 inline-block rounded-full bg-[#b74627]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#b74627]">
                      Mac
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  <strong>{row.capable}/{row.tests}</strong>
                  <span className="ml-2 text-xs text-[#68706c]">capable</span>
                </div>
                <div className="text-sm">
                  <strong>{row.medianSpeedS ?? '—'}s</strong>
                  <span className="ml-2 text-xs text-[#68706c] md:hidden">median</span>
                </div>
                <div className="flex items-center gap-3 md:justify-end">
                  <span className="rounded-md bg-[#b74627] px-3 py-2 text-lg font-black tabular-nums text-white">
                    {scoreOf(row)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d6953]">
                    Q {row.avgQuality ?? '—'}/5
                  </span>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-5 text-[#636a66]">
          Ranked by averaged quality (1–5) then capability rate across the skill-matrix suite. Score
          blends quality (60%) and capability (40%). Tiers are a rough practical-memory grouping for
          orientation; they are not a model benchmark.
          <br />
          Full per-task data and all {top5.length > 0 ? 'the fleet eval runs' : 'runs'} live on the{' '}
          <Link href="/test/results" className="underline hover:text-[#b74627]">
            results page
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
