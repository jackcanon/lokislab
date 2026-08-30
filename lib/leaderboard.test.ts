import assert from 'node:assert/strict';
import test from 'node:test';
import { getLeaderboardData } from './leaderboard.ts';

const originalFetch = globalThis.fetch;
const originalFeedUrl = process.env.LOKISLAB_LEADERBOARD_FEED_URL;

const entry = (status: string, id: string) => ({
  submission_id: id,
  contributor: 'Fixture',
  verification_status: status,
  suite: { id: 'fleet-skill-matrix', version: '2' },
  harness: { name: 'Hermes', version: '1.0.0', profile: 'lokislab-fixed-v1' },
  system: {
    computer_description: 'Test workstation',
    os: 'Linux',
    os_version: '6.14',
    architecture: 'x86_64',
    cpu: 'Test CPU',
    gpu: 'Test GPU',
    memory_gb: 32,
  },
  model: { runtime: 'Ollama', name: 'fixture-model', version: '1' },
  configuration: {
    type: 'publisher_recommended',
    label: 'Publisher recommended',
  },
  score: 91,
  passed: 18,
  total: 19,
  median_seconds: 7.4,
  public_result_url: null,
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalFeedUrl === undefined)
    delete process.env.LOKISLAB_LEADERBOARD_FEED_URL;
  else process.env.LOKISLAB_LEADERBOARD_FEED_URL = originalFeedUrl;
});

void test('uses the verified lab baseline when no feed is configured', async () => {
  delete process.env.LOKISLAB_LEADERBOARD_FEED_URL;
  const data = await getLeaderboardData();
  assert.equal(data.feedState, 'baseline');
  assert.equal(data.results.length, 5);
});

void test('accepts only explicitly public verification statuses from the feed', async () => {
  process.env.LOKISLAB_LEADERBOARD_FEED_URL =
    'https://example.test/leaderboard';
  globalThis.fetch = (async () =>
    Response.json({
      feed_version: '1.0',
      entries: [
        entry('Verified', 'LL-PUBLIC-0001'),
        entry('Under review', 'LL-REVIEW-0001'),
        entry('Rejected', 'LL-REJECT-0001'),
      ],
    })) as typeof fetch;

  const data = await getLeaderboardData();
  assert.equal(data.feedState, 'connected');
  assert.ok(data.results.some((result) => result.id === 'LL-PUBLIC-0001'));
  assert.ok(!data.results.some((result) => result.id === 'LL-REVIEW-0001'));
  assert.ok(!data.results.some((result) => result.id === 'LL-REJECT-0001'));
});

void test('fails closed to the lab baseline when the feed is malformed', async () => {
  process.env.LOKISLAB_LEADERBOARD_FEED_URL =
    'https://example.test/leaderboard';
  globalThis.fetch = (async () =>
    Response.json({ entries: 'not-an-array' })) as typeof fetch;

  const data = await getLeaderboardData();
  assert.equal(data.feedState, 'unavailable');
  assert.equal(data.results.length, 5);
});
