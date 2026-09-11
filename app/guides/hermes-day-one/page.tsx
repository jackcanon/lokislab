import Link from 'next/link';
import './guide.css';
import { HermesOsBar } from '@/components/guides/HermesOsBar';
import { HERMES_GUIDE_BASE, HERMES_OS } from '@/lib/guides';

export const metadata = {
  title: "Hermes Day One — Loki's Lab",
  description:
    'Install Hermes, connect one model provider (Nous, ChatGPT/Codex, Anthropic, or a local Ollama model), and make a file you can open yourself. Linux, Mac, and Windows lanes.',
};

export default function HermesDayOnePage() {
  return (
    <div className="hermes-guide">
      <HermesOsBar />
      <div className="home">
        <main id="main">
          <p className="eyebrow">Hermes 101 · A living field guide</p>
          <h1>
            Our first day
            <br />
            with Hermes.
          </h1>
          <p>Install the assistant. Connect a model. Make something we can open ourselves.</p>
          <p>
            Choose your operating system, then follow one of four guided tracks. Every lane ends with the same
            packing-checklist exercise.
          </p>
          <div className="cards">
            {HERMES_OS.map((o) => (
              <Link key={o.slug} className="card" href={`${HERMES_GUIDE_BASE}/${o.slug}`}>
                <h2>{o.label}</h2>
                <p>{o.blurb}</p>
                <strong>Choose your provider track →</strong>
              </Link>
            ))}
          </div>
          <div className="note">
            <strong>Four tracks in every lane</strong>
            <p>
              01 · Nous account &nbsp; 02 · ChatGPT/Codex login
              <br />
              03 · Anthropic API &nbsp; 04 · Local Ollama model
            </p>
          </div>
          <h2>A guide to keep learning with.</h2>
          <p>
            Keep your guide open beside your terminal. Each version includes copyable commands, checkpoints,
            troubleshooting, and official references. The instructions are editable so we can update them as Hermes
            changes.
          </p>
          <p>
            <strong>Anthropic note:</strong> The guided route uses an API key. Subscription-login eligibility and
            billing need verification; the lane explains the published guidance.
          </p>
        </main>
      </div>
    </div>
  );
}
