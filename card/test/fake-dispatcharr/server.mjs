// Fake Dispatcharr for tests: endless MPEG-TS from ffmpeg at /proxy/ts/stream/<channel>, plus a
// static file server for the test pages on a second port (a different origin, so CORS is real).
//
// The channel ID picks the behaviour, so parallel tests never share state:
//   <mode>[-<arg>]--<anything unique>
//   ok        normal H.264 + AAC stream
//   stall-N   send for N s, then keep the socket open and send nothing
//   drop-N    send for N s, then cut the connection
//   hang      accept the request and never answer (a broken output profile does this)
//   status-N  answer with HTTP status N
//   flaky-N   first N requests get 503, later ones stream normally
//   nocors    stream without Access-Control-Allow-Origin
//   hevc / mpeg2 / ac3 / mp2   stream with that codec
//
// GET /__stats?channel=<id>  → { open, total, queries: [...] }   (all channels without ?channel)
//
// Run standalone: node test/fake-dispatcharr/server.mjs [--port 8930] [--app-port 8931]
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

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
    ff.stdout.on('data', (chunk) => {
      if (!paused && !closed) res.write(chunk);
    });
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
