'use client';

import { useState } from 'react';

export default function PlatformSelector() {
  const [selectedOS, setSelectedOS] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const platforms = {
    macos: {
      name: 'macOS',
      description: 'Intel or Apple Silicon (M1/M2/M3/M4)',
      icon: '🍎',
      variants: {
        'intel-arm': {
          label: 'Auto-detect (Recommended)',
          description: 'Harness detects your CPU automatically',
        },
        'arm64': {
          label: 'Apple Silicon (M1/M2/M3/M4+)',
          description: 'For newer Macs',
        },
        'intel': {
          label: 'Intel Mac',
          description: 'For older Macs (Intel CPU)',
        },
      },
    },
    linux: {
      name: 'Linux',
      description: 'Ubuntu, Debian, Fedora, or other distros',
      icon: '🐧',
      variants: {
        'gpu-nvidia': {
          label: 'NVIDIA GPU (Recommended)',
          description: 'GPU-accelerated testing (fastest)',
        },
        'gpu-amd': {
          label: 'AMD GPU',
          description: 'ROCm-enabled GPU',
        },
        'cpu': {
          label: 'CPU Only',
          description: 'No GPU (slower but works)',
        },
      },
    },
    windows: {
      name: 'Windows',
      description: 'Windows 10+ with Ollama installed',
      icon: '🪟',
      variants: {
        'native': {
          label: 'Windows Native (No WSL2)',
          description: 'PowerShell on standard Windows (NEW!)',
        },
        'wsl2': {
          label: 'Windows WSL2 (Ubuntu)',
          description: 'Using WSL2 subsystem',
        },
      },
    },
  };

  const getCommand = () => {
    if (!selectedOS || !selectedVariant) return null;

    const baseUrl = 'https://lokislab.org/eval';
    const commands: Record<string, Record<string, { cmd: string; desc: string }>> = {
      macos: {
        'intel-arm': {
          cmd: `curl -fsSL ${baseUrl}/setup-check.sh -o ~/setup-check.sh && bash ~/setup-check.sh`,
          desc: 'Pre-flight check (auto-detects your CPU)',
        },
      },
      linux: {
        'gpu-nvidia': {
          cmd: `curl -fsSL ${baseUrl}/setup-check.sh -o ~/setup-check.sh && bash ~/setup-check.sh`,
          desc: 'Pre-flight check (auto-detects NVIDIA GPU)',
        },
        'gpu-amd': {
          cmd: `curl -fsSL ${baseUrl}/setup-check.sh -o ~/setup-check.sh && bash ~/setup-check.sh`,
          desc: 'Pre-flight check (auto-detects AMD GPU)',
        },
        'cpu': {
          cmd: `curl -fsSL ${baseUrl}/setup-check.sh -o ~/setup-check.sh && bash ~/setup-check.sh`,
          desc: 'Pre-flight check (CPU mode)',
        },
      },
      windows: {
        'native': {
          cmd: `# Download setup-check.ps1 from ${baseUrl}/setup-check.ps1\ncd $env:USERPROFILE\nPowerShell -ExecutionPolicy Bypass -File setup-check.ps1`,
          desc: 'Pre-flight check (Windows native, no WSL2)',
        },
        'wsl2': {
          cmd: `curl -fsSL ${baseUrl}/setup-check.sh -o ~/setup-check.sh && bash ~/setup-check.sh`,
          desc: 'Pre-flight check (WSL2 Ubuntu)',
        },
      },
    };

    return commands[selectedOS as string]?.[selectedVariant as string];
  };

  const command = getCommand();

  return (
    <div className="w-full max-w-3xl mx-auto py-8">
      <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-8">
        <h2 className="text-3xl font-bold mb-2">Choose Your Platform</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Select your operating system to get the right command for your system.
        </p>

        {/* Platform Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(platforms).map(([key, platform]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedOS(key);
                setSelectedVariant(null);
              }}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedOS === key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="text-3xl mb-2">{platform.icon}</div>
              <div className="font-bold text-lg">{platform.name}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {platform.description}
              </div>
            </button>
          ))}
        </div>

        {/* Variant Selection */}
        {selectedOS && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">
              Choose your {platforms[selectedOS as keyof typeof platforms].name} setup:
            </h3>
            <div className="space-y-3">
              {Object.entries(
                platforms[selectedOS as keyof typeof platforms].variants
              ).map(([key, variant]) => (
                <button
                  key={key}
                  onClick={() => setSelectedVariant(key)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedVariant === key
                      ? 'border-green-500 bg-green-50 dark:bg-green-950'
                      : 'border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700'
                  }`}
                >
                  <div className="font-semibold">{variant.label}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {variant.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Command Display */}
        {command && (
          <div className="bg-slate-900 dark:bg-slate-800 rounded-lg p-6 mb-6">
            <div className="text-sm text-slate-400 mb-2 font-semibold">
              {command.desc}
            </div>
            <div className="bg-slate-950 rounded p-4 mb-4 overflow-x-auto font-mono text-sm text-slate-100">
              <code>{command.cmd}</code>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(command.cmd);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-semibold transition-colors"
            >
              Copy Command
            </button>
          </div>
        )}

        {/* Next Steps */}
        {command && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="font-bold mb-3 text-blue-900 dark:text-blue-100">
              Next Steps:
            </h3>
            <ol className="space-y-2 text-sm text-blue-900 dark:text-blue-100 list-decimal list-inside">
              <li>Open your terminal (macOS/Linux) or PowerShell (Windows)</li>
              <li>Paste and run the command above</li>
              <li>This will verify your system is ready (5-10 minutes)</li>
              <li>
                Once the check passes, download and run the full V3 test harness
              </li>
              <li>Total test runtime: 60-120 minutes (depends on your hardware)</li>
            </ol>
          </div>
        )}

        {/* Help Text */}
        {!selectedOS && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
            <h3 className="font-bold mb-2 text-amber-900 dark:text-amber-100">
              Not sure which to choose?
            </h3>
            <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1">
              <li>
                <strong>macOS:</strong> Any Apple computer (MacBook, iMac, Mac Mini)
              </li>
              <li>
                <strong>Linux:</strong> Ubuntu, Debian, Fedora, or other Linux distro
              </li>
              <li>
                <strong>Windows:</strong> Desktop or laptop with Windows 10 or later
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
