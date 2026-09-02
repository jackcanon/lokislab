// Prove the REAL site code (getLeaderboardData) accepts our generated sample feed.
// Serves public/leaderboard-feed.json over a local HTTP endpoint, sets the env var,
// calls getLeaderboardData(), and prints the rendered results.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { getLeaderboardData } from '../../lib/leaderboard.ts';

const feed = readFileSync(new URL('../../public/leaderboard-feed.json', import.meta.url));

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(feed);
});

server.listen(0, async () => {
  const port = server.address().port;
  process.env.LOKISLAB_LEADERBOARD_FEED_URL = `http://127.0.0.1:${port}/leaderboard`;
  const data = await getLeaderboardData();
  console.log('feedState:', data.feedState);
  console.log('rendered results:', data.results.length);
  for (const r of data.results) {
    console.log(`  - ${r.id} | ${r.model} | score=${r.score} passed=${r.passed}/${r.total} median=${r.median} | ${r.system} | ${r.status}`);
  }
  server.close();
  process.exit(data.feedState === 'connected' && data.results.length > 0 ? 0 : 1);
});
