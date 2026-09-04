'use client';

import { useState } from 'react';
import Link from 'next/link';

type Platform = 'macos' | 'linux' | 'windows' | null;
type MacVariant = 'apple-silicon' | 'intel' | null;
type LinuxVariant = 'dgx-spark' | 'discrete-gpu' | null;
type Step = 'platform' | 'variant' | 'instructions' | 'results';

export default function TestWizard() {
  const [step, setStep] = useState<Step>('platform');
  const [platform, setPlatform] = useState<Platform>(null);
  const [macVariant, setMacVariant] = useState<MacVariant>(null);
  const [linuxVariant, setLinuxVariant] = useState<LinuxVariant>(null);

  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSecRejUJw49OsKEBOmMKkr2ns4TKZwdeY5Jj3rVSKlU0Hq_3Q/viewform';

  // Step 1: Platform Selection
  const handlePlatformSelect = (p: Platform) => {
    setPlatform(p);
    if (p === 'macos' || p === 'linux') {
      setStep('variant');
    } else {
      setStep('instructions');
    }
  };

  // Step 2: Variant Selection (Mac/Linux)
  const handleMacVariantSelect = (v: MacVariant) => {
    setMacVariant(v);
    setStep('instructions');
  };

  const handleLinuxVariantSelect = (v: LinuxVariant) => {
    setLinuxVariant(v);
    setStep('instructions');
  };

  // Reset
  const handleReset = () => {
    setStep('platform');
    setPlatform(null);
    setMacVariant(null);
    setLinuxVariant(null);
  };

  return (
    <div className="test-wizard">
      {/* Navigation Header - Show current step with back option */}
      {step !== 'platform' && (
        <div className="wizard-nav-header">
          <button onClick={() => setStep('platform')} className="btn-back-header">
            ← Back to Platform Selection
          </button>
        </div>
      )}

      {/* STEP 1: Platform Selection */}
      {step === 'platform' && (
        <div className="wizard-section">
          <div className="wizard-header">
            <h2>Step 1: Choose Your Platform</h2>
            <p className="wizard-description">Select your operating system to begin.</p>
          </div>

          <div className="platform-grid">
            <button
              onClick={() => handlePlatformSelect('macos')}
              className="platform-card"
            >
              <div className="platform-icon">🍎</div>
              <h3>macOS</h3>
              <p>Apple Silicon (M1+) or Intel</p>
            </button>

            <button
              onClick={() => handlePlatformSelect('linux')}
              className="platform-card"
            >
              <div className="platform-icon">🐧</div>
              <h3>Linux</h3>
              <p>DGX Spark or Discrete GPU</p>
            </button>

            <button
              onClick={() => handlePlatformSelect('windows')}
              className="platform-card"
            >
              <div className="platform-icon">🪟</div>
              <h3>Windows</h3>
              <p>Native Windows (no WSL2)</p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2A: macOS Variant Selection */}
      {step === 'variant' && platform === 'macos' && (
        <div className="wizard-section">
          <div className="wizard-header">
            <h2>Step 1: macOS Variant</h2>
            <p className="wizard-description">Choose your CPU type for the correct instructions.</p>
          </div>

          <div className="variant-grid">
            <button
              onClick={() => handleMacVariantSelect('apple-silicon')}
              className="variant-card"
            >
              <h3>Apple Silicon (M1/M2/M3/M4)</h3>
              <p>Fast • Unified memory • Recommended</p>
            </button>

            <button
              onClick={() => handleMacVariantSelect('intel')}
              className="variant-card variant-warning"
            >
              <h3>Intel Mac</h3>
              <p>⚠️ CPU-only • Very slow (15-30 min)</p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2B: Linux Variant Selection */}
      {step === 'variant' && platform === 'linux' && (
        <div className="wizard-section">
          <div className="wizard-header">
            <h2>Step 1: Linux Variant</h2>
            <p className="wizard-description">Choose your hardware architecture.</p>
          </div>

          <div className="variant-grid">
            <button
              onClick={() => handleLinuxVariantSelect('dgx-spark')}
              className="variant-card"
            >
              <h3>DGX Spark</h3>
              <p>NVIDIA Grace/H100 • Unified memory</p>
            </button>

            <button
              onClick={() => handleLinuxVariantSelect('discrete-gpu')}
              className="variant-card"
            >
              <h3>Discrete GPU (NVIDIA/AMD)</h3>
              <p>Standard Linux GPU setup</p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Instructions */}
      {step === 'instructions' && (
        <div className="wizard-section">
          <div className="wizard-progress">
            <span className="progress-step active">1. Pre-flight</span>
            <span className="progress-divider">→</span>
            <span className="progress-step active">2. Run Test</span>
            <span className="progress-divider">→</span>
            <span className="progress-step active">3. Submit Results</span>
          </div>

          {/* macOS Apple Silicon */}
          {platform === 'macos' && macVariant === 'apple-silicon' && (
            <div className="instructions">
              <h2>macOS Apple Silicon (M1+)</h2>

              <h3>Step 1: Pre-flight Check</h3>
              <p>Verify your system is ready:</p>
              <pre>
                <code>
                  {`# Download pre-flight checker
curl -fsSL https://lokislab.org/eval/setup-check.sh -o ~/setup-check.sh
bash ~/setup-check.sh`}
                </code>
              </pre>
              <p className="instruction-note">
                This checks: Ollama installation, disk space (30GB+), network access, and system RAM (16GB+).
              </p>

              <h3>Step 2: Run the V3 Test</h3>
              <p>Download and run the harness:</p>
              <pre>
                <code>
                  {`curl -fsSL https://lokislab.org/eval/v3_test_harness_macos.sh -o ~/v3_test_harness_macos.sh
bash ~/v3_test_harness_macos.sh`}
                </code>
              </pre>
              <p className="instruction-note">
                <strong>Typical runtime:</strong> 3–5 minutes for inference + test execution.<br/>
                <strong>Model auto-selected:</strong> qwen3.6:latest (22B) for 36GB M4 Max down to qwen3.5:4b (4B) for 16GB M1.
              </p>

              <h3>Step 3: Submit Results</h3>
              <p>Once complete, the harness saves JSON results to <code>~/loki-v3-test/</code>.</p>
              <button onClick={() => setStep('results')} className="btn-primary">
                Go to Results Submission →
              </button>
            </div>
          )}

          {/* macOS Intel */}
          {platform === 'macos' && macVariant === 'intel' && (
            <div className="instructions">
              <h2>macOS Intel (CPU-only)</h2>
              <div className="warning-box">
                ⚠️ <strong>Important:</strong> Intel Macs don't have unified memory. Inference runs on CPU only, which is <strong>very slow</strong> (15–30 minutes per test).
              </div>

              <h3>Step 1: Pre-flight Check</h3>
              <p>Verify your system is ready:</p>
              <pre>
                <code>
                  {`# Download pre-flight checker
curl -fsSL https://lokislab.org/eval/setup-check.sh -o ~/setup-check.sh
bash ~/setup-check.sh`}
                </code>
              </pre>
              <p className="instruction-note">
                This checks: Ollama installation, disk space (30GB+), network access, and system RAM (16GB+).
              </p>

              <h3>Step 2: Run the V3 Test</h3>
              <p>Download and run the harness:</p>
              <pre>
                <code>
                  {`curl -fsSL https://lokislab.org/eval/v3_test_harness_macos.sh -o ~/v3_test_harness_macos.sh
bash ~/v3_test_harness_macos.sh`}
                </code>
              </pre>
              <p className="instruction-note">
                <strong>Typical runtime:</strong> 15–30 minutes (CPU-only inference is slow).<br/>
                <strong>Model auto-selected:</strong> qwen3.6:latest (slow) or qwen3.5:4b (slower) based on available RAM.
              </p>

              <h3>Step 3: Submit Results</h3>
              <p>Once complete, the harness saves JSON results to <code>~/loki-v3-test/</code>.</p>
              <button onClick={() => setStep('results')} className="btn-primary">
                Go to Results Submission →
              </button>
            </div>
          )}

          {/* Linux DGX Spark */}
          {platform === 'linux' && linuxVariant === 'dgx-spark' && (
            <div className="instructions">
              <h2>Linux DGX Spark (NVIDIA Grace/H100)</h2>

              <h3>Step 1: Pre-flight Check</h3>
              <p>Verify your system is ready:</p>
              <pre>
                <code>
                  {`# Download pre-flight checker
curl -fsSL https://lokislab.org/eval/setup-check.sh -o ~/setup-check.sh
bash ~/setup-check.sh`}
                </code>
              </pre>
              <p className="instruction-note">
                This checks: Ollama installation, disk space (100GB+ for large models), NVIDIA drivers, and unified memory detection.
              </p>

              <h3>Step 2: Run the V3 Test</h3>
              <p>Download and run the harness:</p>
              <pre>
                <code>
                  {`curl -fsSL https://lokislab.org/eval/v3_test_harness.sh -o ~/v3_test_harness.sh
bash ~/v3_test_harness.sh`}
                </code>
              </pre>
              <p className="instruction-note">
                <strong>Typical runtime:</strong> 2–5 minutes (unified memory + high-end GPU).<br/>
                <strong>Model auto-selected:</strong> qwen3.8-flash-next (125B) if 75GB+, else qwen3.8:27b, down to qwen3.5:4b.
              </p>

              <h3>Step 3: Submit Results</h3>
              <p>Once complete, the harness saves JSON results to <code>~/loki-v3-test/</code>.</p>
              <button onClick={() => setStep('results')} className="btn-primary">
                Go to Results Submission →
              </button>
            </div>
          )}

          {/* Linux Discrete GPU */}
          {platform === 'linux' && linuxVariant === 'discrete-gpu' && (
            <div className="instructions">
              <h2>Linux Discrete GPU (NVIDIA/AMD)</h2>

              <h3>Step 1: Pre-flight Check</h3>
              <p>Verify your system is ready:</p>
              <pre>
                <code>
                  {`# Download pre-flight checker
curl -fsSL https://lokislab.org/eval/setup-check.sh -o ~/setup-check.sh
bash ~/setup-check.sh`}
                </code>
              </pre>
              <p className="instruction-note">
                This checks: Ollama installation, disk space (30GB+), GPU VRAM detection (nvidia-smi or rocm-smi), and system RAM.
              </p>

              <h3>Step 2: Run the V3 Test</h3>
              <p>Download and run the harness:</p>
              <pre>
                <code>
                  {`curl -fsSL https://lokislab.org/eval/v3_test_harness.sh -o ~/v3_test_harness.sh
bash ~/v3_test_harness.sh`}
                </code>
              </pre>
              <p className="instruction-note">
                <strong>Typical runtime:</strong> 5–15 minutes depending on GPU VRAM.<br/>
                <strong>Model auto-selected:</strong> Based on GPU VRAM (qwen3.8:27b for 35GB+, qwen3.6:latest for 25GB+, qwen3.5:4b for 8GB+).<br/>
                <strong>Heimdall (RTX 4070):</strong> ~12GB VRAM → qwen3.6:latest
              </p>

              <h3>Step 3: Submit Results</h3>
              <p>Once complete, the harness saves JSON results to <code>~/loki-v3-test/</code>.</p>
              <button onClick={() => setStep('results')} className="btn-primary">
                Go to Results Submission →
              </button>
            </div>
          )}

          {/* Windows */}
          {platform === 'windows' && (
            <div className="instructions">
              <h2>Windows (Native, No WSL2)</h2>

              <h3>Step 1: Pre-flight Check</h3>
              <p>Verify your system is ready:</p>
              <pre>
                <code>
                  {`# Open PowerShell and run:
powershell -ExecutionPolicy Bypass -File <(Invoke-WebRequest -Uri "https://lokislab.org/eval/setup-check.ps1" -UseBasicParsing).Content`}
                </code>
              </pre>
              <p className="instruction-note">
                This checks: Ollama installation, disk space (30GB+), GPU VRAM (nvidia-smi), and system RAM.
              </p>

              <h3>Step 2: Run the V3 Test</h3>
              <p>Download and run the harness in PowerShell:</p>
              <pre>
                <code>
                  {`# Open PowerShell and run:
powershell -ExecutionPolicy Bypass -File <(Invoke-WebRequest -Uri "https://lokislab.org/eval/v3_test_harness.ps1" -UseBasicParsing).Content`}
                </code>
              </pre>
              <p className="instruction-note">
                <strong>Typical runtime:</strong> 5–15 minutes depending on GPU VRAM.<br/>
                <strong>Model auto-selected:</strong> Based on GPU VRAM (qwen3.8:27b for 35GB+, qwen3.6:latest for 25GB+, qwen3.5:4b for 8GB+).
              </p>

              <h3>Step 3: Submit Results</h3>
              <p>Once complete, the harness saves JSON results to <code>%USERPROFILE%\loki-v3-test\</code>.</p>
              <button onClick={() => setStep('results')} className="btn-primary">
                Go to Results Submission →
              </button>
            </div>
          )}

          <button onClick={handleReset} className="btn-back" style={{ marginTop: 30 }}>
            ← Start Over
          </button>
        </div>
      )}

      {/* STEP 4: Results Submission */}
      {step === 'results' && (
        <div className="wizard-section">
          <div className="wizard-header">
            <h2>Step 3: Submit Your Results</h2>
            <p className="wizard-description">Share your test results with the community.</p>
          </div>

          <div className="results-box">
            <h3>Your Test Results</h3>
            <p>
              The harness saved your results here:
            </p>
            <pre>
              <code>
                {platform === 'windows' ? '%USERPROFILE%\\loki-v3-test\\' : '~/loki-v3-test/'}
              </code>
            </pre>

            <h3>Next: Upload to Leaderboard</h3>
            <p>
              Open the community submission form and upload your JSON result file. Your result will be reviewed and added to the public leaderboard within 24 hours.
            </p>

            <a href={FORM_URL} target="_blank" rel="noreferrer" className="btn-primary btn-large">
              Open Submission Form →
            </a>

            <h3>Questions?</h3>
            <p>
              <Link href="/docs/V3-TEST-HOWTO.md" className="underline">
                Read the complete how-to guide →
              </Link>
            </p>

            <button onClick={handleReset} className="btn-back">
              ← Run Another Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
