import Link from 'next/link';
import { HERMES_GUIDE_BASE, HERMES_OS, type HermesOs } from '@/lib/guides';

export function HermesOsBar({ current }: { current?: HermesOs }) {
  return (
    <nav className="platforms" aria-label="Operating system">
      <Link href={HERMES_GUIDE_BASE} aria-current={current ? undefined : 'page'}>Start here</Link>
      {HERMES_OS.map((o) => (
        <Link key={o.slug} href={`${HERMES_GUIDE_BASE}/${o.slug}`} aria-current={current === o.slug ? 'page' : undefined}>
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
