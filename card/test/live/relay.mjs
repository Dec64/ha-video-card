// Applies the recommended Dispatcharr output profile locally, for testing against a real channel
// before the profile is fixed on the server:
//   node test/live/relay.mjs <raw channel URL> [--port 8940]
// Serves the converted stream at http://127.0.0.1:<port>/proxy/ts/stream/relay and counts
// connections at /__stats (same shape as the fake server).
import { spawn } from 'node:child_process';
import http from 'node:http';

export const PROFILE_ARGS = [
  '-fflags',
  '+discardcorrupt+genpts+nobuffer',
  '-probesize',
  '1M',
  '-analyzeduration',
  '1M',
  '-i',
  'pipe:0',
  '-map',
  '0:v:0?',
  '-map',
  '0:a:0?',
  '-sn',
  '-dn',
  '-c:v',
  'copy',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-ac',
  '2',
  '-ar',
  '48000',
  '-max_muxing_queue_size',
  '4096',
  '-flush_packets',
  '1',
  '-mpegts_flags',
  '+pat_pmt_at_frames+resend_headers+initial_discontinuity',
  '-f',
  'mpegts',
  'pipe:1',
];

export async function startRelay(source, port = 0) {
  const stats = { open: 0, total: 0 };
  const server = http.createServer((req, res) => {
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (req.url.startsWith('/__stats')) {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(stats));
    }
    if (!req.url.startsWith('/proxy/ts/stream/')) {
      res.writeHead(404, cors);
      return res.end();
    }
    stats.total++;
    stats.open++;
    const curl = spawn('curl', ['-sSN', '--fail', source], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...PROFILE_ARGS], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    curl.stdout.pipe(ff.stdin);
    ff.stdin.on('error', () => {});
    res.writeHead(200, { ...cors, 'Content-Type': 'video/mp2t', 'Cache-Control': 'no-cache' });
    ff.stdout.pipe(res);
    let closed = false;
    const done = () => {
      if (closed) return;
      closed = true;
      stats.open--;
      curl.kill('SIGKILL');
      ff.kill('SIGKILL');
    };
    res.on('close', done);
    ff.on('exit', () => res.end());
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    stats: () => ({ ...stats }),
    close: () => new Promise((r) => server.close(r)),
  };
}

if (process.argv[1] && process.argv[1].endsWith('relay.mjs')) {
  const src = process.argv[2];
  if (!src) {
    console.error('usage: node test/live/relay.mjs <raw channel URL> [--port 8940]');
    process.exit(1);
  }
  const i = process.argv.indexOf('--port');
  const r = await startRelay(src, i > 0 ? Number(process.argv[i + 1]) : 8940);
  console.log(`relay: ${r.url}/proxy/ts/stream/relay`);
}
