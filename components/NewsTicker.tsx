"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Stories that cycle through the top wire — one at a time, slowly transitioning.
// The server passes them in as plain data so this component stays stateless.

export type TickerStory = {
  title: string;
  href: string;
  source: string;
};

interface Props {
  stories: TickerStory[];
}

export function NewsTicker({ stories }: Props) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (stories.length < 2) return;

    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % stories.length);
    }, 7000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stories.length]);

  if (stories.length === 0) {
    return (
      <span className="ml-auto shrink-0 text-[#aeb6b2]">Signal, not noise</span>
    );
  }

  const current = stories[active];
  const next = stories[(active + 1) % stories.length];

  return (
    <div className="relative h-[36px] overflow-hidden">
      {/* Static News caption — always visible, never rotates */}
      <span className="absolute left-5 top-1/2 -translate-y-1/2 z-10">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#e2734c]">
          News
        </span>
      </span>
      {/* current story — inset right of the News caption so they never overlap */}
      <div
        key={current.href}
        className="absolute left-[64px] top-1/2 h-6 -translate-y-1/2 animate-[fade-slide_700ms_ease-in-out_100ms_forwards] flex w-full items-center"
      >
        <span className="mr-2 flex-none text-[#e2734c]">◆</span>
        <Link
          href={current.href}
          className="group flex-1 truncate font-semibold uppercase tracking-[0.16em] text-[#e9e4db] transition hover:text-[#e2734c]"
        >
          {current.title}
          <span className="ml-1 opacity-0 group-hover:opacity-100 text-[#aeb6b2]">
            →
          </span>
        </Link>
      </div>

      {/* next story — preloaded, fades out to right when its turn comes */}
      <div
        key={next.href}
        className="absolute right-0 top-1/2 h-6 -translate-y-1/2 animate-[fade-slide-right_700ms_ease-in-out_100ms_forwards] hidden w-[60%] justify-end"
      >
        <Link
          href={next.href}
          className="flex-1 truncate font-semibold uppercase tracking-[0.16em] text-[#e9e4db]/40 transition hover:text-[#e2734c]"
        >
          {next.title}
        </Link>
      </div>

      {stories.length > 1 && (
        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#aeb6b2]">
          next up
        </span>
      )}

      <style jsx>{`
        @keyframes fade-slide {
          0% {
            opacity: 0;
            transform: translateY(-1/2) translateX(-12px);
          }
          100% {
            opacity: 1;
            transform: translateY(-1/2) translateX(0);
          }
        }
        @keyframes fade-slide-right {
          0% {
            opacity: 0.5;
            transform: translateY(-1/2) translateX(12px);
          }
          100% {
            opacity: 0;
            transform: translateY(-1/2) translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
