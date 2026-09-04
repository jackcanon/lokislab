import Link from 'next/link';
import PlatformSelector from './components/PlatformSelector';

export const metadata = {
  title: "Run the benchmark — Loki's Lab",
  description:
    "Run the V3 long-context benchmark on your own hardware and submit the result to the community leaderboard.",
};

// Public eval scripts
const V3_HARNESS_URL = '/eval/v3_test_harness.sh';
const LEGACY_WSL2_SCRIPT_URL = '/eval/lokislab-wsl2-eval.sh';
const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSecRejUJw49OsKEBOmMKkr2ns4TKZwdeY5Jj3rVSKlU0Hq_3Q/viewform';

export default function TestPage() {
  return (
    <main className="wrap" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px' }}>
      <h1>Run the V3 benchmark</h1>
      <p className="lede">
        Loki&apos;s Lab tests agents on a long-context task (V3: 4096 input tokens, 256 max output).
        Run it on your hardware, get reproducible results, and submit evidence to our community
        leaderboard.
      </p>

      {/* NEW: Interactive Platform Selector */}
      <div style={{ margin: '40px 0' }}>
        <h2>Choose Your Platform</h2>
        <p>Select your operating system to get the right command for your system:</p>
        <PlatformSelector />
      </div>

      <h2>What you need</h2>
      <ul>
        <li><strong>macOS:</strong> M1+ Mac with 16GB+ RAM, Ollama installed (Intel Macs supported but very slow — CPU-only)</li>
        <li><strong>Linux:</strong> 16GB+ RAM, NVIDIA GPU recommended, Ollama installed</li>
        <li><strong>Windows:</strong> Native Windows 10+ OR WSL2 (Ubuntu), Ollama for Windows</li>
      </ul>

      <p>
        <strong>New to this?</strong> Read the{' '}
        <Link href="/docs/V3-TEST-HOWTO.md" className="underline hover:text-[#b74627]">
          complete how-to guide
        </Link>{' '}
        for step-by-step setup and troubleshooting.
      </p>

      <h2>Installation: Ollama</h2>
      <p>
        If you don't have Ollama installed, the harness will guide you through setup. Otherwise:
      </p>
      <ul>
        <li>
          <strong>macOS:</strong>{' '}
          <a href="https://ollama.ai/download/Ollama-darwin.zip" target="_blank" rel="noreferrer">
            Download from ollama.ai
          </a>{' '}
          or <code>brew install ollama</code>
        </li>
        <li>
          <strong>Linux:</strong> <code>curl https://ollama.ai/install.sh | sh</code>
        </li>
        <li>
          <strong>Windows WSL2:</strong>{' '}
          <a href="https://ollama.ai/download" target="_blank" rel="noreferrer">
            Download Windows installer
          </a>
          , then run <code>ollama serve</code> in WSL2 Ubuntu
        </li>
        <li>
          <strong>Windows Native:</strong>{' '}
          <a href="https://ollama.ai/download" target="_blank" rel="noreferrer">
            Download Windows installer
          </a>
          , then run <code>ollama serve</code> in PowerShell
        </li>
      </ul>

      <h2>1. Run the V3 test harness</h2>

      <p>Open your terminal (bash/zsh on macOS/Linux, or PowerShell on Windows) and run:</p>

      <pre>
        <code>
          {`curl -fsSL https://lokislab.org/eval/v3_test_harness.sh -o ~/v3_test_harness.sh
bash ~/v3_test_harness.sh`}
        </code>
      </pre>

      <p>
        <em>On Windows (native, no WSL2)?</em> Download{' '}
        <a href="/eval/setup-check.ps1" download className="underline hover:text-[#b74627]">
          setup-check.ps1
        </a>{' '}
        and run: <code>powershell -ExecutionPolicy Bypass -File setup-check.ps1</code>
      </p>

      <p>
        The harness validates your setup (SSH, Ollama, disk space), pulls models if needed, runs
        the V3 test, and saves JSON results to your home directory. Typical runtime: 60–120
        minutes depending on hardware and model size.
      </p>

      <h2>What the V3 test measures</h2>
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

      <h2>2. Submit your result</h2>

      <p>
        Once the harness completes, it writes a JSON result file (e.g.,{' '}
        <code>qwen3.6_latest__yourhost__V3.json</code>) to the results directory. Upload this file
        through the community form for review and publication.
      </p>

      <p>
        <a href={FORM_URL} target="_blank" rel="noreferrer" className="underline hover:text-[#b74627]">
          Open the submission form →
        </a>
      </p>

      <h2>Troubleshooting</h2>

      <p>
        <strong>Model pull timeouts?</strong> The harness detects pull failures and suggests
        remediation:
      </p>
      <ul>
        <li>Check network bandwidth: <code>ping ollama.ai</code></li>
        <li>
          Pre-cache models on a fast machine and copy to others (detailed guide in harness output)
        </li>
        <li>
          Restart Ollama: <code>killall ollama && ollama serve</code>
        </li>
        <li>
          Check disk space: <code>df -h ~/.ollama/models</code>
        </li>
      </ul>

      <p>
        <strong>Using the legacy WSL2 harness?</strong>{' '}
        <Link href="/test/legacy" className="underline hover:text-[#b74627]">
          See WSL2 benchmark instructions
        </Link>
      </p>

      <h2>View aggregated results</h2>

      <p>
        <Link href="/test/results" className="underline hover:text-[#b74627]">
          View aggregated test results →
        </Link>
      </p>

      <p style={{ marginTop: 16 }}>
        <Link href="/">← Back home</Link>
      </p>
    </main>
  );
}
