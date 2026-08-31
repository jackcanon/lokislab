import Link from 'next/link';

export const metadata = {
  title: "Run the benchmark — Loki's Lab",
  description:
    'Run a local-AI throughput benchmark on your own hardware and submit the result to the Loki’s Lab community leaderboard.',
};

// The public eval script, served from /public/eval/lokislab-wsl2-eval.sh.
const SCRIPT_URL = '/eval/lokislab-wsl2-eval.sh';
const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSecRejUJw49OsKEBOmMKkr2ns4TKZwdeY5Jj3rVSKlU0Hq_3Q/viewform';

export default function TestPage() {
  return (
    <main className="wrap" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px' }}>
      <h1>Run the benchmark</h1>
      <p className="lede">
        Loki’s Lab is a community resource for which local models fit on which
        hardware. You can contribute a real datapoint from your own machine in
        about ten minutes.
      </p>

      <h2>What you need</h2>
      <ul>
        <li>A Windows PC with WSL2 (Ubuntu) installed</li>
        <li>An NVIDIA GPU with the WSL-support driver (Game Ready / Studio)</li>
        <li>No prior tooling — the script installs what it needs</li>
      </ul>

      <h2>1. Run the script</h2>
      <p>
        Open your <strong>WSL2 Ubuntu</strong> terminal (not PowerShell) and run:
      </p>
      <pre
        style={{
          background: '#0d1117',
          color: '#e6edf3',
          padding: 16,
          borderRadius: 10,
          overflowX: 'auto',
          fontFamily: 'var(--font-geist-mono, monospace)',
        }}
      >
        <code>
          curl -fsSL https://lokislab.org{SCRIPT_URL} -o ~/lokislab-eval.sh
          {'\n'}bash ~/lokislab-eval.sh
        </code>
      </pre>
      <p className="muted">
        The script checks your GPU, installs Ollama (via the official Windows
        installer if missing), runs three timed generations, and writes a
        submission JSON to your home folder.
      </p>

      <h2>2. Submit your result</h2>
      <p>
        Upload the generated <code>lokislab-submission.json</code> through the
        community form. It is reviewed for schema-validity and privacy before
        appearing on the leaderboard.
      </p>
      <p>
        <a className="cta" href={FORM_URL} target="_blank" rel="noreferrer">
          Open the submission form →
        </a>
      </p>

      <h2>How results are used</h2>
      <p className="muted">
        Submissions are public evidence after a privacy review. The pipeline
        never exposes your email, local paths, or private IP addresses. See the
        benchmark submissions documentation for the full status model.
      </p>

      <p style={{ marginTop: 32 }}>
        <a href="/test/results" className="cta">View aggregated test results →</a>
      </p>
      <p style={{ marginTop: 16 }}>
        <Link href="/">← Back home</Link>
      </p>
    </main>
  );
}
