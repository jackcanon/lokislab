'use client';

import { useMemo, useState } from 'react';

type Result = {
  model: string;
  score: number;
  passed: number;
  total: number;
  median: number;
  tier: 'Entry' | 'Midrange' | 'High-end';
};

const results: Result[] = [
  { model: 'gemma4:12b-it-qat', score: 96, passed: 18, total: 18, median: 38.7, tier: 'Entry' },
  { model: 'gemma3:4b', score: 87, passed: 17, total: 18, median: 4.6, tier: 'Entry' },
  { model: 'llama3.1:8b', score: 78, passed: 16, total: 18, median: 6.8, tier: 'Entry' },
  { model: 'qwen3.5:9b', score: 68, passed: 13, total: 18, median: 132.2, tier: 'Entry' },
  { model: 'qwen3.5:4b', score: 47, passed: 9, total: 18, median: 79.1, tier: 'Entry' },
];

export function Leaderboard() {
  const [sort, setSort] = useState<'score' | 'speed'>('score');
  const sorted = useMemo(
    () => [...results].sort((a, b) => (sort === 'score' ? b.score - a.score : a.median - b.median)),
    [sort],
  );

  return (
    <section id="leaderboard" className="border-y border-[#a9a093] bg-[#f7f3eb]">
      <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 lg:px-14">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#b74627]">The Agent Leaderboard</p>
            <h2 className="display-serif max-w-3xl text-4xl leading-[1.03] tracking-[-0.035em] md:text-6xl">
              Local models, judged by the work.
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
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

        <div className="overflow-hidden rounded-xl border border-[#aaa194] bg-white">
          <div className="hidden grid-cols-[52px_1.55fr_1fr_0.9fr_0.65fr_0.65fr] gap-4 border-b border-[#d1cbc1] bg-[#e8e4dc] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5c625f] md:grid">
            <span>Rank</span><span>Model</span><span>System</span><span>Coverage</span><span>Median</span><span>Score</span>
          </div>
          {sorted.map((result, index) => (
            <article
              key={result.model}
              className="grid gap-3 border-b border-[#ddd7ce] px-5 py-5 last:border-0 md:grid-cols-[52px_1.55fr_1fr_0.9fr_0.65fr_0.65fr] md:items-center md:gap-4"
            >
              <span className="display-serif text-3xl text-[#8a8175]">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="font-mono text-sm font-bold md:text-base">{result.model}</h3>
                <p className="mt-1 text-xs text-[#68706c]">Publisher config · Hermes fixed profile</p>
              </div>
              <div className="text-sm">
                <p className="font-semibold">Mac mini · M2 Pro</p>
                <p className="text-xs text-[#68706c]">16GB · macOS 15 · arm64</p>
              </div>
              <div className="text-sm"><strong>{result.passed}/{result.total}</strong><span className="ml-2 text-xs text-[#68706c]">capable</span></div>
              <div className="text-sm"><strong>{result.median}s</strong><span className="ml-2 text-xs text-[#68706c] md:hidden">median</span></div>
              <div className="flex items-center gap-3 md:justify-end">
                <span className="rounded-md bg-[#b74627] px-3 py-2 text-lg font-black tabular-nums text-white">{result.score}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d6953]">Verified</span>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-5 text-[#636a66]">
          Fleet Skill Matrix v2 · 18 applicable tests on macOS · verified Loki’s Lab run, August 27, 2026. Launch scores average quality and accuracy; failed tests score zero. Speed is the median across applicable tasks.
        </p>
      </div>
    </section>
  );
}
