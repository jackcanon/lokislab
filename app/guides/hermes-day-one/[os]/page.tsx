import { notFound } from 'next/navigation';
import '../guide.css';
import { CopyButtons } from '@/components/guides/CopyButtons';
import { HermesOsBar } from '@/components/guides/HermesOsBar';
import { HERMES_OS, isHermesOs, readHermesLane } from '@/lib/guides';

export function generateStaticParams() {
  return HERMES_OS.map((o) => ({ os: o.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ os: string }> }) {
  const { os } = await params;
  const lane = HERMES_OS.find((o) => o.slug === os);
  return {
    title: lane ? `Hermes Day One for ${lane.label} — Loki's Lab` : "Hermes Day One — Loki's Lab",
    description: lane
      ? `Four guided tracks for ${lane.label}: Nous, ChatGPT/Codex, Anthropic, and local Ollama.`
      : undefined,
  };
}

export default async function HermesLanePage({ params }: { params: Promise<{ os: string }> }) {
  const { os } = await params;
  if (!isHermesOs(os)) notFound();
  const { body, toc } = readHermesLane(os);
  const lane = HERMES_OS.find((o) => o.slug === os)!;

  return (
    <div className="hermes-guide">
      <HermesOsBar current={os} />
      <div className="layout">
        <aside aria-label="On this page" dangerouslySetInnerHTML={{ __html: toc }} />
        {/* Generated from content/guides/hermes-day-one/source — see docs/GUIDES.md */}
        <main id="main" data-lane={lane.slug} dangerouslySetInnerHTML={{ __html: body }} />
      </div>
      <CopyButtons scope=".hermes-guide main" />
    </div>
  );
}
