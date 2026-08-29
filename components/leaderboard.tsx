'use client';

import type { LeaderboardData, LeaderboardResult } from '@/lib/leaderboard';
import { useMemo, useState } from 'react';

type LeaderboardProps = LeaderboardData;

const suiteKey = (result: LeaderboardResult) =>
  `${result.suiteId}@${result.suiteVersion}`;

export function Leaderboard({ results, feedState }: LeaderboardProps) {
  const [sort, setSort] = useState<'score' | 'speed'>('score');
  const suites = useMemo(
    () => [...new Set(results.map(suiteKey))].sort(),
    [results],
  );
  const [suite, setSuite] = useState(() => suites[0] ?? '');
  const sorted = useMemo(
    () =>
      results
        .filter((result) => suiteKey(result) === suite)
        .sort((a, b) =>
          sort === 'score' ? b.score - a.score : a.median - b.median,
        ),
    [results, sort, suite],
  );
  const feedLabel =
    feedState === 'connected'
      ? 'Community feed connected'
      : feedState === 'unavailable'
        ? 'Community feed unavailable · verified lab results shown'
        : 'Verified lab baseline';

  return (
    <section
      id="leaderboard"
      className="border-y border-[#a9a093] bg-[#f7f3eb]"
    >
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
          <div className="space-y-3 text-sm md:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2d6953]">
              {feedLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="text-[#626966]">Sort:</span>
              {(['score', 'speed'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setSort(option)}
                  className={`rounded-full border px-4 py-2 font-semibold capitalize transition ${
                    sort === option
                      ? 'border-[#17201f] bg-[#17201f] text-white'
                      : 'border-[#aca396] bg-transparent hover:border-[#17201f]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {suites.length > 1 && (
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="mr-1 font-bold uppercase tracking-[0.12em] text-[#626966]">
              Suite:
            </span>
            {suites.map((option) => (
              <button
                key={option}
                onClick={() => setSuite(option)}
                className={`rounded-full border px-3 py-1.5 font-semibold transition ${suite === option ? 'border-[#b74627] bg-[#b74627] text-white' : 'border-[#aca396] hover:border-[#b74627]'}`}
              >
                {option.replace('@', ' v')}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-[#aaa194] bg-white">
          <div className="hidden grid-cols-[52px_1.55fr_1fr_0.9fr_0.65fr_0.65fr] gap-4 border-b border-[#d1cbc1] bg-[#e8e4dc] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5c625f] md:grid">
            <span>Rank</span>
            <span>Model</span>
            <span>System</span>
            <span>Coverage</span>
            <span>Median</span>
            <span>Score</span>
          </div>
          {sorted.map((result, index) => (
            <article
              key={result.id}
              className="grid gap-3 border-b border-[#ddd7ce] px-5 py-5 last:border-0 md:grid-cols-[52px_1.55fr_1fr_0.9fr_0.65fr_0.65fr] md:items-center md:gap-4"
            >
              <span className="display-serif text-3xl text-[#8a8175]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                {result.publicUrl ? (
                  <a
                    href={result.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sm font-bold hover:text-[#b74627] md:text-base"
                  >
                    {result.model}
                  </a>
                ) : (
                  <h3 className="font-mono text-sm font-bold md:text-base">
                    {result.model}
                  </h3>
                )}
                <p className="mt-1 text-xs text-[#68706c]">
                  {result.configuration} · {result.harnessProfile}
                </p>
              </div>
              <div className="text-sm">
                <p className="font-semibold">{result.system}</p>
                <p className="text-xs text-[#68706c]">{result.systemMeta}</p>
              </div>
              <div className="text-sm">
                <strong>
                  {result.passed}/{result.total}
                </strong>
                <span className="ml-2 text-xs text-[#68706c]">capable</span>
              </div>
              <div className="text-sm">
                <strong>{result.median}s</strong>
                <span className="ml-2 text-xs text-[#68706c] md:hidden">
                  median
                </span>
              </div>
              <div className="flex items-center gap-3 md:justify-end">
                <span className="rounded-md bg-[#b74627] px-3 py-2 text-lg font-black tabular-nums text-white">
                  {result.score}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d6953]">
                  {result.status}
                </span>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-5 text-[#636a66]">
          {suite.replace('@', ' v')} · only like suite versions are ranked
          together. Scores average quality and accuracy; incapable runs score
          zero. Speed is the median across applicable runs. Community rows
          appear only after JSON validation, privacy clearance, and an explicit
          Leaderboard Ready approval.
        </p>
      </div>
    </section>
  );
}
