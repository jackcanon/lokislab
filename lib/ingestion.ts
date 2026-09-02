// Loki's Lab editorial ingestion (LL-013 trusted vs Open Net; LL-014 hide/remove + log).
// Typed, dependency-free. Matches the codebase's isObject/text/finite helpers.

export type FeedSource = 'trusted' | 'open-net';

export type DiscoveryItem = {
  id: string;
  title: string;
  source: string; // original source name/domain
  sourceUrl: string; // external link
  publishedAt: string; // ISO 8601
  feed: FeedSource;
  // Open Net items are leads, never original reporting:
  isLead: boolean;
  hidden: boolean; // set by editor (LL-014)
};

export type IngestionLogEntry = {
  itemId: string;
  action: 'hide' | 'show' | 'remove';
  at: string; // ISO 8601
  by: string; // editor identity
  reason?: string;
  // Provenance is NEVER altered by hide/remove:
  originalSource: string;
  originalSourceUrl: string;
  originalTitle: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const isoDate = (value: unknown) => {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null;
  return value;
};

function coerceItem(value: unknown, fallbackFeed: FeedSource): DiscoveryItem | null {
  if (!isObject(value)) return null;
  const id = text(value.id);
  const title = text(value.title);
  const source = text(value.source);
  const sourceUrl = text(value.sourceUrl);
  const publishedAt = isoDate(value.publishedAt);
  if (!id || !title || !source || !sourceUrl || !publishedAt) return null;
  const feed: FeedSource =
    value.feed === 'trusted' || value.feed === 'open-net'
      ? (value.feed as FeedSource)
      : fallbackFeed;
  return {
    id,
    title,
    source,
    sourceUrl,
    publishedAt,
    feed,
    isLead: feed === 'open-net',
    hidden: false,
  };
}

/**
 * LL-013 — merge trusted + Open Net feeds but keep them separable.
 * Honors a `feed` filter so the UI can show trusted-only / open-net-only / both.
 */
export function mergeFeeds(
  trusted: unknown[],
  openNet: unknown[],
): DiscoveryItem[] {
  const items = [
    ...trusted.map((t) => coerceItem(t, 'trusted')),
    ...openNet.map((o) => coerceItem(o, 'open-net')),
  ].filter((i): i is DiscoveryItem => i !== null);
  // stable sort: publishedAt desc
  return items.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function filterByFeed(
  items: DiscoveryItem[],
  filter: FeedSource | 'all',
): DiscoveryItem[] {
  // Hidden items are excluded from every view (LL-014); only the private
  // ingestion log retains them for editor review/reversal.
  return items.filter(
    (i) => !i.hidden && (filter === 'all' || i.feed === filter),
  );
}

/**
 * LL-014 — editor hide/remove with a private, reversible ingestion log.
 * Hide/remove NEVER mutate original source attribution; the log preserves it.
 */
export function applyEditorAction(
  item: DiscoveryItem,
  action: 'hide' | 'show' | 'remove',
  editor: string,
  at: string,
  reason?: string,
): { item: DiscoveryItem; log: IngestionLogEntry } {
  const next: DiscoveryItem = { ...item };
  if (action === 'hide') next.hidden = true;
  else if (action === 'show') next.hidden = false;
  // 'remove' hides without deleting provenance (soft removal).
  else if (action === 'remove') next.hidden = true;

  const log: IngestionLogEntry = {
    itemId: item.id,
    action,
    at,
    by: editor,
    reason,
    originalSource: item.source,
    originalSourceUrl: item.sourceUrl,
    originalTitle: item.title,
  };
  return { item: next, log };
}
