export function matchesProject(url: string, spaces: { url: string }[]): boolean {
  try {
    const activity = new URL(url);
    if (!['https:', 'http:'].includes(activity.protocol)) return false;
    return spaces.some((space) => {
      try {
        const home = new URL(space.url);
        if (!['https:', 'http:'].includes(home.protocol) || activity.hostname !== home.hostname) return false;
        const path = home.pathname.replace(/\/$/, '').toLowerCase();
        const target = activity.pathname.toLowerCase();
        if (home.hostname === 'github.com') {
          const repo = path.split('/').filter(Boolean);
          return repo.length === 2 && target.split('/').filter(Boolean).slice(0, 2).join('/') === repo.join('/');
        }
        return target === path || target.startsWith(path + '/');
      } catch { return false; }
    });
  } catch { return false; }
}
