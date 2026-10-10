import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('/test/results', "Local model benchmark results — Loki's Lab", 'Compare published local model benchmark results by model and hardware. Inspect accuracy, speed, status and the limits of each test.');
export default function ResultsLayout({children}: {children: React.ReactNode}) { return children; }
