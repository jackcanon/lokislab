// Avoid changing API endpoints, asset requests or the publishing editor.
export function prefersMarkdown(accept: string): boolean {
  const quality = (type: string) => Math.max(0, ...accept.toLowerCase().split(',').map(part => {
    const [media, ...params] = part.trim().split(';');
    if (media.trim() !== type) return 0;
    const q = params.map(p => p.trim()).find(p => p.startsWith('q='));
    return q ? Number(q.slice(2)) || 0 : 1;
  }));
  const markdown = quality('text/markdown');
  return markdown > 0 && markdown >= quality('text/html');
}
