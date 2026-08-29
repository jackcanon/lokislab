export type VerificationStatus = 'Unverified' | 'Verified';

export type LeaderboardResult = {
  id: string;
  model: string;
  score: number;
  passed: number;
  total: number;
  median: number;
  system: string;
  systemMeta: string;
  configuration: string;
  harnessProfile: string;
  suiteId: string;
  suiteVersion: string;
  status: VerificationStatus;
  publicUrl?: string;
};

export type LeaderboardFeedState = 'baseline' | 'connected' | 'unavailable';

export type LeaderboardData = {
  results: LeaderboardResult[];
  feedState: LeaderboardFeedState;
};

const labResults: LeaderboardResult[] = [
  {
    id: 'LAB-FSM2-GEMMA4-12B',
    model: 'gemma4:12b-it-qat',
    score: 96,
    passed: 18,
    total: 18,
    median: 38.7,
    system: 'Mac mini · M2 Pro',
    systemMeta: '16GB · macOS 15 · arm64',
    configuration: 'Publisher recommended',
    harnessProfile: 'Hermes fixed profile',
    suiteId: 'fleet-skill-matrix',
    suiteVersion: '2',
    status: 'Verified',
  },
  {
    id: 'LAB-FSM2-GEMMA3-4B',
    model: 'gemma3:4b',
    score: 87,
    passed: 17,
    total: 18,
    median: 4.6,
    system: 'Mac mini · M2 Pro',
    systemMeta: '16GB · macOS 15 · arm64',
    configuration: 'Publisher recommended',
    harnessProfile: 'Hermes fixed profile',
    suiteId: 'fleet-skill-matrix',
    suiteVersion: '2',
    status: 'Verified',
  },
  {
    id: 'LAB-FSM2-LLAMA31-8B',
    model: 'llama3.1:8b',
    score: 78,
    passed: 16,
    total: 18,
    median: 6.8,
    system: 'Mac mini · M2 Pro',
    systemMeta: '16GB · macOS 15 · arm64',
    configuration: 'Publisher recommended',
    harnessProfile: 'Hermes fixed profile',
    suiteId: 'fleet-skill-matrix',
    suiteVersion: '2',
    status: 'Verified',
  },
  {
    id: 'LAB-FSM2-QWEN35-9B',
    model: 'qwen3.5:9b',
    score: 68,
    passed: 13,
    total: 18,
    median: 132.2,
    system: 'Mac mini · M2 Pro',
    systemMeta: '16GB · macOS 15 · arm64',
    configuration: 'Publisher recommended',
    harnessProfile: 'Hermes fixed profile',
    suiteId: 'fleet-skill-matrix',
    suiteVersion: '2',
    status: 'Verified',
  },
  {
    id: 'LAB-FSM2-QWEN35-4B',
    model: 'qwen3.5:4b',
    score: 47,
    passed: 9,
    total: 18,
    median: 79.1,
    system: 'Mac mini · M2 Pro',
    systemMeta: '16GB · macOS 15 · arm64',
    configuration: 'Publisher recommended',
    harnessProfile: 'Hermes fixed profile',
    suiteId: 'fleet-skill-matrix',
    suiteVersion: '2',
    status: 'Verified',
  },
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const finite = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

function parsePublicEntry(value: unknown): LeaderboardResult | null {
  if (
    !isObject(value) ||
    !isObject(value.suite) ||
    !isObject(value.harness) ||
    !isObject(value.system) ||
    !isObject(value.model) ||
    !isObject(value.configuration)
  )
    return null;

  const id = text(value.submission_id);
  const status = value.verification_status;
  const suiteId = text(value.suite.id);
  const suiteVersion = text(value.suite.version);
  const modelName = text(value.model.name);
  const modelVersion = text(value.model.version);
  const system = text(value.system.computer_description);
  const os = text(value.system.os);
  const osVersion = text(value.system.os_version);
  const architecture = text(value.system.architecture);
  const memory = finite(value.system.memory_gb);
  const score = finite(value.score);
  const passed = finite(value.passed);
  const total = finite(value.total);
  const median = finite(value.median_seconds);

  // The website repeats the publication allowlist. Unknown or review-only
  // statuses are discarded even if an upstream feed is misconfigured.
  if (
    !id ||
    (status !== 'Unverified' && status !== 'Verified') ||
    !suiteId ||
    !suiteVersion ||
    !modelName ||
    !modelVersion ||
    !system ||
    !os ||
    !osVersion ||
    !architecture ||
    memory === null ||
    score === null ||
    passed === null ||
    total === null ||
    median === null ||
    score < 0 ||
    score > 100 ||
    passed < 0 ||
    total < 1 ||
    passed > total ||
    median < 0
  )
    return null;

  const runtime = text(value.model.runtime);
  const gpu = text(value.system.gpu);
  const configuration =
    text(value.configuration.label) ?? 'Custom configuration';
  const harnessProfile = text(value.harness.profile) ?? 'Versioned profile';
  const publicUrl = text(value.public_result_url);

  return {
    id,
    model: `${modelName}:${modelVersion}`,
    score: Math.round(score),
    passed: Math.round(passed),
    total: Math.round(total),
    median,
    system,
    systemMeta: `${memory}GB · ${os} ${osVersion} · ${architecture}${gpu ? ` · ${gpu}` : ''}`,
    configuration,
    harnessProfile: `${runtime ? `${runtime} · ` : ''}${harnessProfile}`,
    suiteId,
    suiteVersion,
    status,
    publicUrl:
      publicUrl && /^https?:\/\//i.test(publicUrl) ? publicUrl : undefined,
  };
}

function mergeResults(community: LeaderboardResult[]) {
  const byId = new Map(labResults.map((result) => [result.id, result]));
  community.forEach((result) => byId.set(result.id, result));
  return [...byId.values()];
}

export async function getLeaderboardData(): Promise<LeaderboardData> {
  const feedUrl = process.env.LOKISLAB_LEADERBOARD_FEED_URL?.trim();
  if (!feedUrl) return { results: labResults, feedState: 'baseline' };

  try {
    const response = await fetch(feedUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok)
      throw new Error(`Leaderboard feed returned ${response.status}.`);

    const payload: unknown = await response.json();
    if (!isObject(payload) || !Array.isArray(payload.entries))
      throw new Error('Leaderboard feed has an unsupported shape.');

    const community = payload.entries
      .map(parsePublicEntry)
      .filter((entry): entry is LeaderboardResult => entry !== null);
    return { results: mergeResults(community), feedState: 'connected' };
  } catch {
    return { results: labResults, feedState: 'unavailable' };
  }
}
