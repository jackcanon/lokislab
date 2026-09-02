import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeFeeds,
  filterByFeed,
  applyEditorAction,
  type DiscoveryItem,
} from './ingestion.ts';

const trustedRaw = [
  {
    id: 't1',
    title: 'Ollama 24B scores 91 on v2',
    source: 'Official Ollama Blog',
    sourceUrl: 'https://ollama.com/blog/post',
    publishedAt: '2026-08-28T10:00:00Z',
    feed: 'trusted',
  },
];

const openNetRaw = [
  {
    id: 'o1',
    title: 'Someone benchmarked a tiny model',
    source: 'random-forum.example',
    sourceUrl: 'https://random-forum.example/t/123',
    publishedAt: '2026-08-29T09:00:00Z',
    feed: 'open-net',
  },
];

test('LL-013: merge keeps trusted and open-net separable', () => {
  const items = mergeFeeds(trustedRaw, openNetRaw);
  assert.equal(items.length, 2);
  const trusted = filterByFeed(items, 'trusted');
  const open = filterByFeed(items, 'open-net');
  assert.equal(trusted.length, 1);
  assert.equal(open.length, 1);
  assert.equal(open[0].isLead, true); // open net items are leads
  assert.equal(trusted[0].isLead, false);
});

test('LL-013: every item exposes source + published time', () => {
  const items = mergeFeeds(trustedRaw, openNetRaw);
  for (const i of items) {
    assert.ok(i.source.length > 0);
    assert.ok(!Number.isNaN(Date.parse(i.publishedAt)));
    assert.ok(/^https?:\/\//.test(i.sourceUrl));
  }
});

test('LL-014: hide is reversible and preserves provenance', () => {
  const items = mergeFeeds(trustedRaw, openNetRaw);
  const target: DiscoveryItem = items[0];
  const { item, log } = applyEditorAction(target, 'hide', 'editor@lokislab', '2026-08-29T12:00:00Z', 'off-topic');
  assert.equal(item.hidden, true);
  assert.equal(log.action, 'hide');
  assert.equal(log.originalSource, target.source); // provenance intact
  assert.equal(log.originalSourceUrl, target.sourceUrl);
  assert.equal(log.originalTitle, target.title);

  const { item: shown } = applyEditorAction(item, 'show', 'editor@lokislab', '2026-08-29T12:05:00Z');
  assert.equal(shown.hidden, false); // reversible
});

test('LL-014: remove is soft (hidden) and does not erase attribution', () => {
  const items = mergeFeeds(trustedRaw, openNetRaw);
  const target = items[1];
  const { item, log } = applyEditorAction(target, 'remove', 'editor@lokislab', '2026-08-29T12:10:00Z');
  assert.equal(item.hidden, true);
  assert.equal(log.originalSource, target.source);
  assert.equal(item.source, target.source); // attribution unchanged
});

test('LL-014: filterByFeed excludes hidden items', () => {
  let items = mergeFeeds(trustedRaw, openNetRaw);
  const { item: hidden } = applyEditorAction(items[0], 'hide', 'editor@lokislab', '2026-08-29T12:00:00Z');
  items = items.map((i) => (i.id === hidden.id ? hidden : i));
  const visible = filterByFeed(items, 'all');
  assert.equal(visible.length, 1); // hidden one excluded
});
