'use client';

import { summary, runs, feedMeta } from '@/lib/skillMatrix';
import { specForNickname, MachineSpec } from '@/lib/machine-specs';
import Link from 'next/link';
import { useState, useMemo } from 'react';

type Tier = 'small' | 'medium' | 'large' | 'unknown';

function tierFor(model: string): Tier {
  const m = model.toLowerCase();

  // Small tier: fits comfortably on 8GB-class machines
  if (
    /1b|1\.5b|3b|3\.5b|4b|5b|7b|8b|1b-/i.test(m) ||
    /gemma3:1b|gemma3:4b|gemma:2b|gemma2:2b|llama3\.2:1b|llama3\.2:3b|llama3\.2:3b-it|llama3\.1:8b|llama3:8b|llama2:7b|phi-?3\.5|phi-?3|qwq/i.test(m)
  ) {
    return 'small';
  }

  // Large tier: wants 32GB+ or specialist hardware
  if (
    /32b|34b|72b|120b|122b|30b|33b|35b|65b|70b|175b|176b|200b|341b|405b|406b|562b|1t|100b|v150|claude-opus|claude-sonnet-4|claude-sonnet-5|gpt-?4|o1|o3|gemini-2\.5-pro|gemini-2\.5-flash|grok-4/i.test(m)
  ) {
    return 'large';
  }

  // Medium tier: 14B-30B class, comfortable on 16GB-32GB
  if (
    /14b|15b|20b|24b|27b|30b|14b-/i.test(m) ||
    /gemma3:8b|gemma3:12b|gemma:7b|gemma2:9b|gemma2:27b|llama3\.1:14b|llama3\.1:16b|llama3\.1:405b/i.test(m) ||
    /mistral-large|mistral-medium|ministral|command-r|dbrx|starcoder2|mixtral|openhermes|open-mixtral|allganimals/i.test(m)
  ) {
    return 'medium';
  }

  return 'unknown';
}

function tierLabel(tier: Tier): string {
  return {
    small: 'Tiny — 1B–8B class',
    medium: 'Medium — 14B–30B class',
    large: 'Large — 32B+ class',
    unknown: 'Untiered',
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

function fmt(n: number | null, d = 1) {
  return n === null ? '—' : n.toFixed(d);
}

function bar(v: number | null, max = 5) {
  if (v === null) return 0;
  return Math.max(0, Math.min(100, (v / max) * 100));
}

interface Stat {
  label: string;
  value: string;
}

function Stat({ label, value }: Stat) {
  return (
    <div className="rounded-lg bg-[#f5f0ea] p-3 text-center">
      <div className="text-xs font-bold uppercase tracking-wider text-[#6e7773]">{label}</div>
      <div className="mt-1 text-xl font-black text-[#17201f]">{value}</div>
    </div>
  );
}

interface ScoreProps {
  v: number | null;
}

function Score({ v }: ScoreProps) {
  if (v === null) return <>—</>;
  const pct = bar(v);
  const bg = v >= 4.5 ? 'bg-[#2d6953]' : v >= 3.5 ? 'bg-[#9c6b2d]' : v >= 2.5 ? 'bg-[#b74627]' : 'bg-[#8a8175]';
  return (
    <div className="flex items-center gap-2">
      <span>{v.toFixed(1)}</span>
      <div className="w-12 rounded-full bg-[#e3dccd]">
        <div className={`h-2 rounded-full ${bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface Th {
  align?: 'left' | 'right';
  children: React.ReactNode;
}

function Th({ align = 'left', children }: Th) {
  return <th className={`border-r border-[#aaa194] px-3 py-2 text-left text-xs font-bold uppercase tracking-wider ${align === 'right' ? 'text-right' : ''}`}>{children}</th>;
}

interface Td {
  align?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
}

function Td({ align = 'left', className = '', children }: Td) {
  return <td className={`border-r border-[#aaa194] px-3 py-2 text-sm ${align === 'right' ? 'text-right' : ''} ${className}`}>{children}</td>;
}

export default function ResultsPage() {
  const totalRuns = runs.length;
  const v3Runs = runs.filter((r) => r.testId === 'V3');
  const models = Array.from(new Set(summary.map((s) => s.model))).filter(Boolean).sort();
  const machines = Array.from(new Set(summary.map((s) => s.machine))).filter(Boolean).sort();

  // Extract unique specs for filtering
  const specs = machines
    .map((m) => specForNickname(m))
    .filter((s) => s !== null) as MachineSpec[];
  
  const uniqueSpecs = Array.from(new Map(specs.map((s) => [s!.display, s])).values());
  const gpuTypes = Array.from(new Set(specs.map((s) => s!.coreGpu))).sort();
  const platforms = Array.from(new Set(specs.map((s) => s!.platform))).sort();

  // Filter state
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  // Filtered data
  const filteredSummary = useMemo(() => {
    return summary.filter((s) => {
      // Hide unlabeled/empty model entries
      if (!s.model || s.model.trim() === '') return false;
      if (!s.machine || s.machine.trim() === '') return false;
      
      const spec = specForNickname(s.machine);
      if (!spec) return true;
      if (selectedMachine && spec.display !== selectedMachine) return false;
      if (selectedPlatform && spec.platform !== selectedPlatform) return false;
      return true;
    });
  }, [selectedMachine, selectedPlatform]);

  const filteredV3Runs = useMemo(() => {
    return v3Runs.filter((r) => {
      const spec = specForNickname(r.machine);
      if (!spec) return true;
      if (selectedMachine && spec.display !== selectedMachine) return false;
      if (selectedPlatform && spec.platform !== selectedPlatform) return false;
      return true;
    });
  }, [selectedMachine, selectedPlatform]);

  return (
    <main className="min-h-screen bg-[#ece5d8] text-[#17201f]">
      <section className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 lg:px-14">
        <div className="mb-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#b74627]">
              Test results
            </p>
            <h1 className="display-serif text-4xl font-black tracking-tight md:text-5xl">
              What the runs actually show.
            </h1>
          </div>
          <p className="max-w-2xl text-[#3a423f]">
            Real fleet eval runs from the{' '}
            <strong>skill-matrix</strong> suite — {totalRuns} tasks across{' '}
            {models.length} models and {machines.length} machines. Each task runs under a fixed
            Hermes harness; we report median speed, time to first token where available, and
            averaged quality and accuracy.
          </p>
        </div>

        {/* Quick stats */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Total runs" value={totalRuns.toString()} />
          <Stat label="Models" value={models.length.toString()} />
          <Stat label="Machines" value={machines.length.toString()} />
          <Stat label="V3 results" value={v3Runs.length.toString()} />
        </div>

        {/* FILTERS */}
        <div className="mb-8 rounded-lg bg-[#f5f0ea] p-6">
          <h2 className="display-serif mb-4 text-lg font-bold">Filter by hardware</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Machine filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6e7773] mb-2">
                Machine/Model
              </label>
              <select
                value={selectedMachine || ''}
                onChange={(e) => setSelectedMachine(e.target.value || null)}
                className="w-full rounded border border-[#aaa194] bg-white px-3 py-2 text-sm"
              >
                <option value="">All machines ({machines.length})</option>
                {uniqueSpecs.map((spec) => (
                  <option key={spec!.display} value={spec!.display}>
                    {spec!.display} ({spec!.coreGpu} • {spec!.memory})
                  </option>
                ))}
              </select>
            </div>

            {/* Platform filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6e7773] mb-2">
                Platform
              </label>
              <select
                value={selectedPlatform || ''}
                onChange={(e) => setSelectedPlatform(e.target.value || null)}
                className="w-full rounded border border-[#aaa194] bg-white px-3 py-2 text-sm"
              >
                <option value="">All platforms ({platforms.length})</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(selectedMachine || selectedPlatform) && (
            <button
              onClick={() => {
                setSelectedMachine(null);
                setSelectedPlatform(null);
              }}
              className="mt-4 text-sm font-semibold text-[#b74627] hover:text-[#9a3a20]"
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        <h2 className="display-serif mb-4 text-2xl font-bold">Summary by model</h2>
        <p className="mb-4 text-sm text-[#6e7773]">
          Aggregated scores across all machines and runs ({filteredSummary.length} rows shown).
        </p>
        <div className="overflow-x-auto rounded-lg border border-[#aaa194] mb-10">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-[#17201f] text-[#e9e4db]">
              <tr>
                <Th>Tier</Th>
                <Th>Model</Th>
                <Th>Machine</Th>
                <Th align="right">Tests</Th>
                <Th align="right">Capable</Th>
                <Th align="right">Avg Quality</Th>
                <Th align="right">Avg Accuracy</Th>
                <Th align="right">Median Speed</Th>
                <Th align="right">TTFT</Th>
                <Th>Last tested</Th>
              </tr>
            </thead>
            <tbody>
              {filteredSummary.map((s, i) => {
                const spec = specForNickname(s.machine);
                const tier = tierFor(s.model);
                const isMac = spec && spec.tier === 'mac';
                return (
                  <tr
                    key={i}
                    className={`${i % 2 ? 'bg-[#e3dccd]' : 'bg-[#ece5d8]'} ${isMac ? 'bg-[#f3ead4]' : ''}`}
                  >
                    <Td>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierClass(tier)}`}>
                        {tierLabel(tier)}
                      </span>
                    </Td>
                    <Td className="font-semibold">
                      {s.model || <span className="text-[#9a9384]">unlabeled</span>}
                    </Td>
                    <Td>
                      {spec ? spec.display : (s.machine || <span className="text-[#9a9384]">—</span>)}
                      {isMac && (
                        <span className="ml-1 inline-block rounded-full bg-[#b74627]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#b74627]">
                          Mac
                        </span>
                      )}
                    </Td>
                    <Td align="right">{s.tests}</Td>
                    <Td align="right">{s.capable}/{s.tests}</Td>
                    <Td align="right"><Score v={s.avgQuality} /></Td>
                    <Td align="right"><Score v={s.avgAccuracy} /></Td>
                    <Td align="right">{fmt(s.medianSpeedS)}</Td>
                    <Td align="right">
                      {s.ttftMs !== undefined && s.ttftMs !== null ? fmt(s.ttftMs, 0) : '—'}
                    </Td>
                    <Td className="text-[#6e7773]">
                      {s.lastTested ? s.lastTested.slice(0, 10) : '—'}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h2 className="display-serif mt-12 mb-4 text-2xl font-bold">All runs (V3)</h2>
        <p className="mb-4 text-sm text-[#6e7773]">Every individual V3 long-context task result ({filteredV3Runs.length} rows shown).</p>
        <div className="overflow-x-auto rounded-lg border border-[#aaa194] max-h-[70vh]">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-[#17201f] text-[#e9e4db]">
              <tr>
                <Th>Tier</Th>
                <Th>Model</Th>
                <Th>Machine</Th>
                <Th>Category</Th>
                <Th>Test</Th>
                <Th align="right">Capable</Th>
                <Th align="right">Quality (1-5)</Th>
                <Th align="right">Accuracy (1-5)</Th>
                <Th align="right">Speed (sec)</Th>
                <Th align="right">TTFT (ms)</Th>
                <Th align="right">Out tokens</Th>
                <Th>Tested</Th>
              </tr>
            </thead>
            <tbody>
              {filteredV3Runs.map((r, i) => {
                const spec = specForNickname(r.machine);
                const tier = tierFor(r.model);
                const isMac = spec && spec.tier === 'mac';
                return (
                  <tr
                    key={i}
                    className={`${i % 2 ? 'bg-[#e3dccd]' : 'bg-[#ece5d8]'} ${isMac ? 'bg-[#f3ead4]' : ''}`}
                  >
                    <Td>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierClass(tier)}`}>
                        {tierLabel(tier)}
                      </span>
                    </Td>
                    <Td className="font-semibold">{r.model || '—'}</Td>
                    <Td>
                      {spec ? spec.display : (r.machine || '—')}
                      {isMac && (
                        <span className="ml-1 inline-block rounded-full bg-[#b74627]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#b74627]">
                          Mac
                        </span>
                      )}
                    </Td>
                    <Td>{r.category}</Td>
                    <Td>{r.testId}</Td>
                    <Td align="right">{r.capable ? '✓' : '✗'}</Td>
                    <Td align="right"><Score v={r.quality} /></Td>
                    <Td align="right"><Score v={r.accuracy} /></Td>
                    <Td align="right">{fmt(r.speedSeconds, 1)}</Td>
                    <Td align="right">{r.ttftMs !== undefined && r.ttftMs !== null ? fmt(r.ttftMs, 0) : '—'}</Td>
                    <Td align="right">{r.outTokens || '—'}</Td>
                    <Td className="text-[#6e7773]">{r.testedAt ? r.testedAt.slice(0, 10) : '—'}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 32, textAlign: 'center' }}>
          <Link href="/" className="cta">
            ← Back home
          </Link>
        </p>
      </section>
    </main>
  );
}
