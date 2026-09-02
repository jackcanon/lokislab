// Human-readable machine specs for every Loki test machine.
// Internal nickname → display spec. Nickname stays visible as a secondary badge.
//
// Fleet (as of Sep 2026):
//   Asgard     = Mac Mini M2 Pro 16 GB
//   Midgaard   = Mac Mini M4 Pro 24 GB
//   Odin       = MacBook Pro 16" M4 Pro 24 GB
//   Overgaard  = Mac Studio M4 Max 36 GB
//   Jotunheim  = MacBook Pro M1 Pro 16 GB  (data key: m1pro)
//   Vanaheim   = Mac Mini M1 8 GB           (not yet in data)
//   Heimdall   = Custom PC 64 GB + RTX 4070 16 GB VRAM
//
// Data keys that appear in skill-matrix.json: asgard, midgaard, odin,
// overgaard, heimdall, m1pro, m2pro, cloud.
// m1pro is Jotunheim. m2pro is a 2-run alias for the same Asgard hardware.

export type MachineSpec = {
  nickname: string;
  display: string;
  short: string;
  tier: 'mac' | 'windows-pc' | 'linux-pc' | 'cloud' | 'unknown';
  platform: string;
  kind: 'laptop' | 'desktop' | 'server' | 'unknown';
  coreGpu: string;
  coreCount: string;       // CPU core count (e.g. "10-core", "24-core")
  memory: string;
  macAddress: string;      // from fleet sheet — may be empty
  ramOnly: boolean;
};

const MACHINE_SPECS: Record<string, MachineSpec> = {
  // Asgard — Mac Mini M2 Pro 16 GB · 10-core CPU
  asgard: {
    nickname: 'Asgard',
    display: 'Mac Mini (M2 Pro, 16 GB)',
    short: 'Mac Mini M2 Pro · 16 GB',
    tier: 'mac',
    platform: 'macOS',
    kind: 'desktop',
    coreGpu: 'Apple M2 Pro',
    coreCount: '10-core',
    memory: '16 GB unified',
    macAddress: '',
    ramOnly: true,
  },

  // Midgaard — Mac Mini M4 Pro 24 GB · 10-core CPU
  midgaard: {
    nickname: 'Midgaard',
    display: 'Mac Mini (M4 Pro, 24 GB)',
    short: 'Mac Mini M4 Pro · 24 GB',
    tier: 'mac',
    platform: 'macOS',
    kind: 'desktop',
    coreGpu: 'Apple M4 Pro',
    coreCount: '10-core',
    memory: '24 GB unified',
    macAddress: '',
    ramOnly: true,
  },

  // Odin — MacBook Pro 16" M4 Pro 24 GB · 10-core CPU
  odin: {
    nickname: 'Odin',
    display: 'MacBook Pro 16" (M4 Pro, 24 GB)',
    short: 'MBP 16" M4 Pro · 24 GB',
    tier: 'mac',
    platform: 'macOS',
    kind: 'laptop',
    coreGpu: 'Apple M4 Pro',
    coreCount: '10-core',
    memory: '24 GB unified',
    macAddress: '',
    ramOnly: true,
  },

  // Overgaard — Mac Studio M4 Max 36 GB · 12-core CPU
  overgaard: {
    nickname: 'Overgaard',
    display: 'Mac Studio (M4 Max, 36 GB)',
    short: 'Mac Studio M4 Max · 36 GB',
    tier: 'mac',
    platform: 'macOS',
    kind: 'desktop',
    coreGpu: 'Apple M4 Max',
    coreCount: '12-core',
    memory: '36 GB unified',
    macAddress: '',
    ramOnly: true,
  },

  // Jotunheim — MacBook Pro M1 Pro 16 GB · 10-core CPU (data key: m1pro)
  m1pro: {
    nickname: 'Jotunheim',
    display: 'MacBook Pro (M1 Pro, 16 GB)',
    short: 'MBP M1 Pro · 16 GB',
    tier: 'mac',
    platform: 'macOS',
    kind: 'laptop',
    coreGpu: 'Apple M1 Pro',
    coreCount: '10-core',
    memory: '16 GB unified',
    macAddress: '',
    ramOnly: true,
  },

  // m2pro — 2-run alias for the same Asgard hardware (Mac Mini M2 Pro 16 GB)
  m2pro: {
    nickname: 'Asgard',
    display: 'Mac Mini (M2 Pro, 16 GB)',
    short: 'Mac Mini M2 Pro · 16 GB',
    tier: 'mac',
    platform: 'macOS',
    kind: 'desktop',
    coreGpu: 'Apple M2 Pro',
    coreCount: '10-core',
    memory: '16 GB unified',
    macAddress: '',
    ramOnly: true,
  },

  // Vanaheim — Mac Mini M1 8 GB · 8-core CPU (not yet in data)
  vanaheim: {
    nickname: 'Vanaheim',
    display: 'Mac Mini (M1, 8 GB)',
    short: 'Mac Mini M1 · 8 GB',
    tier: 'mac',
    platform: 'macOS',
    kind: 'desktop',
    coreGpu: 'Apple M1',
    coreCount: '8-core',
    memory: '8 GB unified',
    macAddress: '',
    ramOnly: true,
  },

  // Heimdall — Custom-built Windows PC 64 GB + RTX 4070 16 GB VRAM · 24-core
  heimdall: {
    nickname: 'Heimdall',
    display: 'Custom PC (64 GB RAM + NVIDIA RTX 4070, 16 GB VRAM)',
    short: 'Custom PC · 64 GB + RTX 4070 · 16 GB VRAM',
    tier: 'windows-pc',
    platform: 'Windows',
    kind: 'desktop',
    coreGpu: 'AMD Ryzen 9 5900X + NVIDIA RTX 4070',
    coreCount: '24-core',
    memory: '64 GB DDR5 + 16 GB VRAM',
    macAddress: '',
    ramOnly: false,
  },

  // cloud — remote/cloud instance
  cloud: {
    nickname: 'Cloud',
    display: 'Cloud instance',
    short: 'Cloud',
    tier: 'cloud',
    platform: 'Cloud',
    kind: 'server',
    coreGpu: '—',
    coreCount: '—',
    memory: '—',
    macAddress: '',
    ramOnly: true,
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function specForNickname(nickname: string | null | undefined): MachineSpec | null {
  if (!nickname) return null;
  return MACHINE_SPECS[nickname] ?? {
    nickname,
    display: nickname.charAt(0).toUpperCase() + nickname.slice(1),
    short: nickname,
    tier: 'unknown',
    platform: 'Unknown',
    kind: 'unknown',
    coreGpu: '—',
    coreCount: '—',
    memory: '—',
    macAddress: '',
    ramOnly: true,
  };
}

export function isMac(spec: MachineSpec): boolean {
  return spec.tier === 'mac';
}
