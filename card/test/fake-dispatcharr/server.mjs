// Fake Dispatcharr for tests: endless MPEG-TS from ffmpeg at /proxy/ts/stream/<channel>, plus a
// static file server for the test pages on a second port (a different origin, so CORS is real).
//
// The channel ID picks the behaviour, so parallel tests never share state:
//   <mode>[-<arg>]--<anything unique>
//   ok        normal H.264 + AAC stream
//   stall-N   send for N s, then keep the socket open and send nothing
//   drop-N    send for N s, then cut the connection
//   gap-N     from 12 s in, hold the data back for N s, then send it all at once (a network hiccup)
//   hang      accept the request and never answer (a broken output profile does this)
//   status-N  answer with HTTP status N
//   flaky-N   first N requests get 503, later ones stream normally
//   nocors    stream without Access-Control-Allow-Origin
//   hevc / mpeg2 / ac3 / mp2   stream with that codec
//
// GET /__stats?channel=<id>  → { open, total, queries: [...] }   (all channels without ?channel)
//
// GET /output/m3u  → a Dispatcharr-style channel playlist. Query parameters:
//   prefix=<p>   channel IDs are <mode>--<p>-<n>, so each test gets its own (default "m3u")
//   n=<count>    number of channels (default 6); groups rotate News / Entertainment / Sport
//   modes=a,b    mode of each channel in turn (default ok), e.g. modes=ok,stall-3
//   fail=<code>  answer with this status; failfirst=<k> fails only the first k requests
//   delay=<ms>   wait before answering
//   longgroups=1 makes every group name very long (layout tests)
// Requests are counted in /__stats under "m3u:<prefix>". Logos: /__logo/<n>.svg (channel 3
// has a broken logo, channel 4 none).
//
// GET /output/epg  → XMLTV for the same channels (channel ID = tvg-id = n), sent in small chunks.
//   Channel n is on "Now n" (started 10 min ago, ends in 20 min), then "Next n", then "Later n".
//   Channel 1's titles carry XML entities ("News & Weather"); channel 4 has no programmes.
//   n=, fail=, failfirst=, delay= as for /output/m3u. Counted under "epg:<prefix>".
//
// Run standalone: node test/fake-dispatcharr/server.mjs [--port 8930] [--app-port 8931]
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const CHANNELS = [
  ['News One HD', 'News'],
  ['Movies Plus', 'Entertainment'],
  ['Sports Live HD', 'Sport'],
  ['News Two', 'News'],
  ['Kids Time', 'Entertainment'],
  ['Sport Extra', 'Sport'],
  ['Docs World', 'Entertainment'],
  ['Music Hits', 'Entertainment'],
];
function m3u(host, params) {
  const prefix = params.get('prefix') || 'm3u';
  const n = Number(params.get('n') || 6);
  const modes = (params.get('modes') || 'ok').split(',');
  const lines = ['#EXTM3U x-tvg-url="http://' + host + '/output/epg"'];
  for (let i = 1; i <= n; i++) {
    const id = `${modes[(i - 1) % modes.length]}--${prefix}-${i}`;
    const [name, base] = CHANNELS[i - 1] ?? [`Channel ${i}`, 'Other'];
    const group = params.get('longgroups')
      ? `${base}: Entertainment, Documentaries and Lifestyle +1 (${base})`
      : base;
    const logo = i === 4 ? '' : ` tvg-logo="http://${host}/__logo/${i === 3 ? 'missing' : i}.svg"`;
    lines.push(
      `#EXTINF:-1 tvg-id="${i}" tvg-name="${name}"${logo} tvg-chno="${100 + i}" ` +
        `group-title="${group}",${name}`,
      `http://${host}/proxy/ts/stream/${encodeURIComponent(id)}`,
    );
  }
  return lines.join('\r\n') + '\r\n';
}

function xmltvTime(ms) {
  return new Date(ms).toISOString().replace(/[-:T]/g, '').slice(0, 14) + ' +0000';
}

function epg(params) {
  const n = Number(params.get('n') || 6);
  const now = Date.now();
  const at = (min) => xmltvTime(now + min * 60_000);
  const out = ['<?xml version="1.0" encoding="UTF-8"?>', '<tv generator-info-name="fake">'];
  for (let i = 1; i <= n; i++)
    out.push(`  <channel id="${i}"><display-name>${i}</display-name></channel>`);
  for (let i = 1; i <= n; i++) {
    if (i === 4) continue;
    const names =
      i === 1
        ? ['News &amp; Weather', 'Q&amp;A &#8211; Live', 'Later 1']
        : [`Now ${i}`, `Next ${i}`, `Later ${i}`];
    // Out of order on purpose: Dispatcharr sorts by database ID, not start time.
    const slots = [
      [1, 20, 50],
      [0, -10, 20],
      [2, 50, 80],
    ];
    for (const [k, from, to] of slots) {
      out.push(
        `  <programme start="${at(from)}" stop="${at(to)}" channel="${i}">`,
        `    <title lang="en">${names[k]}</title>`,
        `    <desc>${'A long description that the card never reads. '.repeat(8)}</desc>`,
        '  </programme>',
      );
    }
  }
  out.push('</tv>');
  return out.join('\n');
}

function logoSvg(i) {
  const hue = (Number(i) * 47) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 40"><rect width="72" height="40" rx="6" fill="hsl(${hue} 60% 45%)"/><text x="36" y="26" font-size="16" text-anchor="middle" fill="#fff" font-family="sans-serif">${i}</text></svg>`;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.map': 'application/json',
  '.json': 'application/json',
  '.css': 'text/css',
};

function parseChannel(id) {
  const spec = id.split('--')[0];
  const m = /^([a-z0-9]+)(?:-(\d+))?$/.exec(spec);
  return m ? { mode: m[1], arg: m[2] === undefined ? undefined : Number(m[2]) } : { mode: 'ok' };
}

function ffmpegArgs(mode) {
  const video =
    mode === 'hevc'
      ? ['-c:v', 'libx265', '-preset', 'ultrafast', '-x265-params', 'log-level=error']
      : mode === 'mpeg2'
        ? ['-c:v', 'mpeg2video', '-b:v', '600k']
        : ['-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-profile:v', 'main'];
  const audio =
    mode === 'ac3'
      ? ['-c:a', 'ac3', '-b:a', '128k']
      : mode === 'mp2'
        ? ['-c:a', 'mp2']
        : ['-c:a', 'aac', '-b:a', '96k'];
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-re',
    '-f',
    'lavfi',
    '-i',
    'testsrc2=size=320x180:rate=25',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=48000',
    ...video,
    '-g',
    '25',
    '-pix_fmt',
    'yuv420p',
    ...audio,
    '-ac',
    '2',
    '-f',
    'mpegts',
    '-mpegts_flags',
    '+resend_headers',
    'pipe:1',
  ];
}

export async function startFakeDispatcharr({ port = 0, appPort = 0, host = '127.0.0.1' } = {}) {
  const channels = new Map();
  const stat = (id) => {
    let s = channels.get(id);
    if (!s) channels.set(id, (s = { open: 0, total: 0, queries: [] }));
    return s;
  };
  const sockets = new Set();

  const streamServer = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        ...cors,
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': '*',
      });
      return res.end();
    }
    if (url.pathname === '/__stats') {
      const ch = url.searchParams.get('channel');
      const body = ch ? stat(ch) : Object.fromEntries(channels);
      res.writeHead(200, {
        ...cors,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      return res.end(JSON.stringify(body));
    }
    if (url.pathname === '/output/m3u') {
      const p = url.searchParams;
      const s = stat(`m3u:${p.get('prefix') || 'm3u'}`);
      s.total++;
      s.queries.push(Object.fromEntries(p));
      const fail = Number(p.get('fail') || 0);
      const failFirst = Number(p.get('failfirst') || 0);
      const answer = () => {
        if (fail && (!failFirst || s.total <= failFirst)) {
          res.writeHead(fail, cors);
          return res.end('error');
        }
        res.writeHead(200, {
          ...cors,
          'Content-Type': 'audio/x-mpegurl; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(m3u(req.headers.host, p));
      };
      const delay = Number(p.get('delay') || 0);
      if (delay) setTimeout(answer, delay);
      else answer();
      return;
    }
    if (url.pathname === '/output/epg') {
      const p = url.searchParams;
      const s = stat(`epg:${p.get('prefix') || 'm3u'}`);
      s.total++;
      s.queries.push(Object.fromEntries(p));
      const fail = Number(p.get('fail') || 0);
      const failFirst = Number(p.get('failfirst') || 0);
      const answer = async () => {
        if (fail && (!failFirst || s.total <= failFirst)) {
          res.writeHead(fail, cors);
          return res.end('error');
        }
        res.writeHead(200, {
          ...cors,
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        // Small chunks, so the card's streaming parser sees tags split across reads.
        const body = Buffer.from(epg(p));
        for (let i = 0; i < body.length; i += 777) {
          res.write(body.subarray(i, i + 777));
          await new Promise((r) => setImmediate(r));
        }
        res.end();
      };
      const delay = Number(p.get('delay') || 0);
      if (delay) setTimeout(answer, delay);
      else void answer();
      return;
    }
    const logo = /^\/__logo\/(\d+)\.svg$/.exec(url.pathname);
    if (logo) {
      res.writeHead(200, {
        ...cors,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'max-age=60',
      });
      return res.end(logoSvg(logo[1]));
    }
    const m = /^\/proxy\/ts\/stream\/([^/]+)$/.exec(url.pathname);
    if (!m) {
      res.writeHead(404, cors);
      return res.end('not found');
    }
    const id = decodeURIComponent(m[1]);
    const { mode, arg } = parseChannel(id);
    const s = stat(id);
    s.total++;
    s.queries.push(Object.fromEntries(url.searchParams));
    s.open++;
    let closed = false;
    const timers = [];
    let ff;
    const done = () => {
      if (closed) return;
      closed = true;
      s.open--;
      timers.forEach(clearTimeout);
      ff?.kill('SIGKILL');
    };
    req.on('close', done);
    res.on('close', done);

    if (mode === 'hang') return; // never answer
    if (mode === 'status') {
      res.writeHead(arg ?? 500, cors);
      return res.end(`status ${arg}`);
    }
    if (mode === 'flaky' && s.total <= (arg ?? 1)) {
      res.writeHead(503, cors);
      return res.end('busy');
    }
    res.writeHead(200, {
      ...(mode === 'nocors' ? {} : cors),
      'Content-Type': 'video/mp2t',
      'Cache-Control': 'no-cache',
    });
    ff = spawn('ffmpeg', ffmpegArgs(mode), { stdio: ['ignore', 'pipe', 'inherit'] });
    let paused = false;
    let held = null;
    ff.stdout.on('data', (chunk) => {
      if (closed || paused) return;
      if (held) held.push(chunk);
      else res.write(chunk);
    });
    if (mode === 'gap') {
      timers.push(setTimeout(() => (held = []), 12_000));
      timers.push(
        setTimeout(
          () => {
            const chunks = held ?? [];
            held = null;
            if (!closed) for (const c of chunks) res.write(c);
          },
          12_000 + (arg ?? 4) * 1000,
        ),
      );
    }
    ff.on('exit', () => {
      if (!closed && mode !== 'stall') res.end();
    });
    if (mode === 'stall') timers.push(setTimeout(() => (paused = true), (arg ?? 3) * 1000));
    if (mode === 'drop') timers.push(setTimeout(() => res.destroy(), (arg ?? 3) * 1000));
  });
  streamServer.on('connection', (sock) => {
    sockets.add(sock);
    sock.on('close', () => sockets.delete(sock));
  });

  // Static files: /local/stream-card/* and /hacsfiles/stream-card/* → dist/, everything else → test/e2e/pages/
  const appServer = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let rel;
    const dist = /^\/(?:local|hacsfiles)\/stream-card\/(.*)$/.exec(url.pathname);
    if (dist) rel = join('dist', dist[1]);
    else if (url.pathname === '/') rel = 'test/e2e/pages/index.html';
    else rel = join('test/e2e/pages', url.pathname);
    const file = normalize(join(ROOT, rel));
    if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    createReadStream(file).pipe(res);
  });

  await new Promise((r) => streamServer.listen(port, host, r));
  await new Promise((r) => appServer.listen(appPort, host, r));
  const sp = streamServer.address().port;
  const ap = appServer.address().port;
  return {
    streamUrl: `http://${host}:${sp}`,
    appUrl: `http://${host}:${ap}`,
    stats: (id) => stat(id),
    async close() {
      for (const sock of sockets) sock.destroy();
      await Promise.all([
        new Promise((r) => streamServer.close(r)),
        new Promise((r) => appServer.close(r)),
      ]);
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name, def) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? Number(process.argv[i + 1]) : def;
  };
  const srv = await startFakeDispatcharr({
    port: arg('--port', 8930),
    appPort: arg('--app-port', 8931),
  });
  console.log(`fake dispatcharr: ${srv.streamUrl}  test pages: ${srv.appUrl}`);
}
