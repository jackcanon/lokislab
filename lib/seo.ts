import type { Metadata } from 'next';

export const siteURL = 'https://lokislab.org';
export const siteName = "Loki's Lab";
export function pageMetadata(path: string, title: string, description: string): Metadata {
  const url = `${siteURL}${path}`;
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { type: 'website', siteName, title, description, url, locale: 'en_US', images: [{url: `${siteURL}/opengraph-image`, width: 1200, height: 630, alt: "Loki's Lab — independent testing, practical guides and people to follow"}] },
    twitter: { card: 'summary_large_image', title, description, images: [`${siteURL}/opengraph-image`] },
  };
}
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
export function isoDate(value?: string): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T.+)?$/.test(value) || Number.isNaN(Date.parse(value))) return undefined;
  return value;
}
