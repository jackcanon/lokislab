import Link from "next/link";
import { summary, runs } from "@/lib/skillMatrix";

export const metadata = {
  title: "Test results - Lokis Lab",
  description: "Real fleet skill-matrix eval runs: models x machines, quality, accuracy, speed.",
};

function fmt(n: number | null, d = 1) {
  return n === null ? "—" : n.toFixed(d);
}
function bar(v: number | null, max = 5) {
  if (v === null) return 0;
  return Math.max(0, Math.min(100, (v / max) * 100));
}

export default function ResultsPage() {
  const totalRuns = runs.length;
  const models = Array.from(new Set(summary.map((s) => s.model))).filter(Boolean).sort();
  const machines = Array.from(new Set(summary.map((s) => s.machine))).filter(Boolean).sort();

  return (
    <main className="min-h-screen bg-[#ece5d8] text-[#17201f]">
      <header className="sticky top-0 z-50 border-b border-[#aaa194] bg-[#ece5d8]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-10 lg:px-14">
          <a href="#top" className="flex items-center gap-3" aria-label="Loki's Lab home">
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-sm bg-[#17201f] text-[#ece5d8]">
              <span className="absolute left-[8px] top-[2px] -rotate-12 font-serif text-2xl font-black">L</span>
              <span className="absolute bottom-[1px] right-[7px] rotate-[168deg] font-serif text-2xl font-black text-[#d26743]">L</span>
            </span>
            <span className="display-serif text-xl font-bold tracking-tight">Loki's Lab</span>
          </a>
          <Link href="/test" className="text-sm font-semibold hover:text-[#b74627]">← Run the benchmark</Link>
        </div>
      </header>

      <section id="top" className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 lg:px-14">
        <h1 className="display-serif text-4xl font-black tracking-tight md:text-5xl">Test results</h1>
        <p className="mt-3 max-w-2xl text-[#3a423f]">
          Real fleet eval runs from the <strong>skill-matrix</strong> suite - {totalRuns} tasks across{" "}
          {models.length} models and {machines.length} machines. Each task runs under a fixed Hermes harness;
          we report median speed and averaged quality/accuracy.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Total runs" value={totalRuns.toString()} />
          <Stat label="Models" value={models.length.toString()} />
          <Stat label="Machines" value={machines.length.toString()} />
          <Stat label="Categories" value={Array.from(new Set(runs.map((r) => r.category))).filter(Boolean).length.toString()} />
        </div>

        <h2 className="display-serif mt-12 mb-4 text-2xl font-bold">Per model x machine</h2>
        <div className="overflow-x-auto rounded-lg border border-[#aaa194]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#17201f] text-[#e9e4db]">
              <tr>
                <Th>Model</Th><Th>Machine</Th><Th align="right">Tests</Th>
                <Th align="right">Capable</Th><Th align="right">Avg Q</Th>
                <Th align="right">Avg A</Th><Th align="right">Median speed (s)</Th>
                <Th>Last tested</Th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s, i) => (
                <tr key={i} className={i % 2 ? "bg-[#e3dccd]" : "bg-[#ece5d8]"}>
                  <Td className="font-semibold">{s.model || <span className="text-[#9a9384]">unlabeled</span>}</Td>
                  <Td>{s.machine || <span className="text-[#9a9384]">—</span>}</Td>
                  <Td align="right">{s.tests}</Td>
                  <Td align="right">{s.capable}/{s.tests}</Td>
                  <Td align="right"><Score v={s.avgQuality} /></Td>
                  <Td align="right"><Score v={s.avgAccuracy} /></Td>
                  <Td align="right">{fmt(s.medianSpeedS)}</Td>
                  <Td className="text-[#6e7773]">{s.lastTested ? s.lastTested.slice(0, 10) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="display-serif mt-12 mb-4 text-2xl font-bold">All runs</h2>
        <p className="mb-4 text-sm text-[#6e7773]">Every individual task result ({runs.length} rows).</p>
        <div className="overflow-x-auto rounded-lg border border-[#aaa194] max-h-[70vh]">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-[#17201f] text-[#e9e4db]">
              <tr>
                <Th>Model</Th><Th>Machine</Th><Th>Category</Th><Th>Test</Th>
                <Th align="right">Capable</Th><Th align="right">Q</Th><Th align="right">A</Th>
                <Th align="right">Speed (s)</Th><Th align="right">Out tok</Th><Th>Tested</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-[#e3dccd]" : "bg-[#ece5d8]"}>
                  <Td className="font-semibold">{r.model || "—"}</Td>
                  <Td>{r.machine || "—"}</Td>
                  <Td>{r.category || "—"}</Td>
                  <Td>{r.testId || "—"}</Td>
                  <Td align="right">{r.capable === null ? "—" : r.capable ? "✓" : "✗"}</Td>
                  <Td align="right">{r.quality ?? "—"}</Td>
                  <Td align="right">{r.accuracy ?? "—"}</Td>
                  <Td align="right">{fmt(r.speedSeconds)}</Td>
                  <Td align="right">{r.outTokens ?? "—"}</Td>
                  <Td className="text-[#6e7773]">{r.testedAt ? r.testedAt.slice(0, 10) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-10 text-xs text-[#9a9384]">
          Source: <code>fleet_eval/skill-matrix-authoritative</code> - snapshot {new Date().toISOString().slice(0, 10)}.
          Regenerate from source before each publish.
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#aaa194] bg-white/40 p-4">
      <div className="display-serif text-3xl font-black">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-[#6e7773]">{label}</div>
    </div>
  );
}
function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return <th className={`px-3 py-2 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, align, className = "" }: { children: React.ReactNode; align?: "right"; className?: string }) {
  return <td className={`px-3 py-1.5 ${align === "right" ? "text-right" : ""} ${className}`}>{children}</td>;
}
function Score({ v }: { v: number | null }) {
  if (v === null) return <span className="text-[#9a9384]">—</span>;
  const pct = bar(v);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-block h-1.5 w-12 overflow-hidden rounded bg-[#cfc7b6]">
        <span className="absolute inset-y-0 left-0 rounded bg-[#b74627]" style={{ width: `${pct}%` }} />
      </span>
      {fmt(v)}
    </span>
  );
}
