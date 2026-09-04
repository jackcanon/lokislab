import Link from 'next/link';
import TestWizard from './components/TestWizard';
import './components/test-wizard.css';

export const metadata = {
  title: "Run the benchmark — Loki's Lab",
  description:
    "Run the V3 long-context benchmark on your own hardware and submit the result to the community leaderboard.",
};

export default function TestPage() {
  return (
    <main className="wrap" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px' }}>
      <h1>Run the V3 Benchmark</h1>
      <p className="lede">
        Loki&apos;s Lab tests agents on a long-context task (V3: 4096 input tokens, 256 max output).
        Run it on your hardware, get reproducible results, and submit evidence to our community
        leaderboard.
      </p>

      {/* Interactive 3-Step Wizard */}
      <TestWizard />

      {/* Info Section */}
      <div style={{ marginTop: 60, paddingTop: 40, borderTop: '1px solid #e5dcd0' }}>
        <h2>About the V3 Test</h2>
        <ul>
          <li>
            <strong>Task:</strong> Long-context reasoning (4096 prompt tokens, 256 max output tokens)
          </li>
          <li>
            <strong>Metric:</strong> Can the model find a hidden word buried in context? (pass/fail)
            + quality/accuracy score (0–5)
          </li>
          <li>
            <strong>Runtime:</strong> Wall-clock time in seconds (how fast the model can process the
            task)
          </li>
          <li>
            <strong>Repeatability:</strong> The test is deterministic — same input always produces
            the same output
          </li>
        </ul>

        <h2>Requirements by Platform</h2>
        <ul>
          <li>
            <strong>macOS:</strong> M1+ Mac with 16GB+ RAM, or Intel Mac (slow, CPU-only). Ollama
            required.
          </li>
          <li>
            <strong>Linux:</strong> 16GB+ system RAM. NVIDIA/AMD GPU recommended (automatic
            detection). Ollama required.
          </li>
          <li>
            <strong>Windows:</strong> Windows 10+ with native execution. GPU VRAM detection
            included. Ollama required.
          </li>
        </ul>

        <h2>Need Help?</h2>
        <p>
          <Link href="/docs/V3-TEST-HOWTO.md" className="underline hover:text-[#b74627]">
            Read the complete how-to guide →
          </Link>
        </p>

        <h2>View Results</h2>
        <p>
          <Link href="/test/results" className="underline hover:text-[#b74627]">
            See all submitted test results →
          </Link>
        </p>

        <p style={{ marginTop: 40 }}>
          <Link href="/">← Back home</Link>
        </p>
      </div>
    </main>
  );
}
