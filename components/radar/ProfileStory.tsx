import profileData from '@/data/radar/profiles.json';

type Story = {
  paragraphs: string[];
  sources: {url: string; label: string; checked_at: string}[];
  videos: {url: string; title: string; source_url: string; checked_at: string; kind?: string}[];
};
export const profileStories: Record<string, Story> = profileData.profiles;

export default function ProfileStory({id, fallback}: {id: string; fallback?: string}) {
  const story = profileStories[id];
  if (!story) return fallback ? <p>{fallback}</p> : null;
  return <section className="radar-story" aria-label="Background and work">
    {story.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    {story.videos.length > 0 && <section aria-label="Videos">
      <h3>Watch and learn</h3>
      <div className="radar-story-videos">{story.videos.map(video => <article key={video.url} className="radar-story-video">
        {video.kind !== 'channel' && <iframe className="radar-story-player" src={`https://www.youtube-nocookie.com/embed/${new URL(video.url).searchParams.get('v')}`} title={video.title} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
        <a href={video.url} target="_blank" rel="noreferrer"><span aria-hidden="true">▶ </span>{video.title} ↗</a>
        <p>{video.kind === 'channel' ? 'YouTube channel' : 'YouTube video'} · <a href={video.source_url} target="_blank" rel="noreferrer">Publisher context ↗</a></p>
      </article>)}</div>
    </section>}
    <details className="radar-story-sources"><summary>Sources and further reading</summary>
      <ul>{story.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} · {new URL(source.url).hostname.replace(/^www\./, '')} ↗</a></li>)}</ul>
    </details>
  </section>;
}
