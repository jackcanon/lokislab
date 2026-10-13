"use client";

import { useState } from "react";
import Image from "next/image";
import visuals from "@/data/radar/visuals.json";

type Visual = { url: string; source_url: string; kind: string };

export default function VisualMark({ id, name, type = "person", large = false }: { id: string; name: string; type?: "person" | "project"; large?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const sources: Record<string, Visual> = type === "person" ? visuals.people : visuals.projects;
  const visual = sources[id];
  const seed = id.split("").reduce((value, letter) => value + letter.charCodeAt(0), 0);
  const initials = name.split(/[\s/_-]+/).filter(Boolean).map(word => word[0]).slice(0, 2).join("").toUpperCase();
  const className = `radar-visual radar-visual-${type} radar-visual-tone-${seed % 5}${large ? " radar-visual-large" : ""}${visual?.kind === "brand" ? " radar-visual-brand" : ""}`;
  const mark = visual && failed !== visual.url ? <Image src={visual.url} alt="" width={108} height={108} unoptimized loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(visual.url)} /> : <span aria-hidden="true">{initials}</span>;
  return visual && failed !== visual.url ? <a className={className} href={visual.source_url} target="_blank" rel="noreferrer" aria-label={`${name}: ${visual.kind === "brand" ? "brand image" : "profile image"} source`} title={`${name} · ${visual.kind === "brand" ? "Brand image" : "Public profile image"}`}>{mark}</a> : <div className={className} aria-label={`${name} letter mark`}>{mark}</div>;
}
