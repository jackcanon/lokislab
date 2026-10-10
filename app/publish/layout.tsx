import type { Metadata } from 'next';
export const metadata: Metadata = { title: "Publish — Loki's Lab", robots: { index: false, follow: false } };
export default function PublishLayout({children}: {children: React.ReactNode}) { return children; }
