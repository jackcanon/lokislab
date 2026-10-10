import type { Metadata } from "next";
import Radar from "@/components/radar/Radar";
import catalog from "@/data/radar/catalog.json";
import projects from "@/data/radar/projects.json";
import feed from "@/data/radar/feed.json";

export const metadata: Metadata = {
  title: "AI Radar — Loki's Lab",
  description:
    "Follow the people building with artificial intelligence. Source-linked updates, practical experiments and new people to investigate.",
};

export default function RadarPage() {
  return <Radar catalog={catalog} feed={feed} projects={projects.projects} />;
}
