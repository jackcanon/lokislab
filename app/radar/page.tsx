import { pageMetadata } from '@/lib/seo';
import Link from "next/link";
import Radar from "@/components/radar/Radar";
import catalog from "@/data/radar/catalog.json";
import projects from "@/data/radar/projects.json";
import feed from "@/data/radar/feed.json";

const pageInfo = {
  title: "AI Radar — Loki's Lab",
  description:
    "Follow the people building with artificial intelligence. Source-linked updates, practical experiments and new people to investigate.",
};
export const metadata = pageMetadata('/radar', pageInfo.title, pageInfo.description);

export default function RadarPage() {
  return <><Radar catalog={catalog} feed={feed} projects={projects.projects} /><p className="mx-auto max-w-6xl px-5"><Link className="text-[#b74627] underline" href="/radar/projects">Browse the project directory →</Link></p></>;
}
