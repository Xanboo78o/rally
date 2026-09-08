// shot.mjs — headless screenshots of the running game, so the render path can be
// checked without a phone in hand.
//
//   node tools/shot.mjs 20 90 175        seconds into the run
//   SHOT_SIZE=390,844 node tools/shot.mjs 20     portrait
//   SHOT_Q='&post=0' node tools/shot.mjs 20      extra query string
//
// The `at=` seconds go through the ?auto&at= hook, which fast-forwards the simulation
// synchronously BEFORE the first frame. That is the only reliable way to catch an exact
// moment — chromium's --virtual-time-budget on its own is not deterministic with rAF,
// which cost me a lot of confusing screenshots the first time round.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:net';

const OUT = process.env.SHOT_DIR || '/tmp/rallyshots';
const SIZE = (process.env.SHOT_SIZE || '844,390');
const EXTRA = process.env.SHOT_Q || '';
const times = process.argv.slice(2).map(Number).filter(n => !Number.isNaN(n));
const at = times.length ? times : [8, 45, 90, 130, 175, 215, 250, 285];

mkdirSync(OUT, { recursive: true });

// Two things about this environment, both learned the hard way, both of which quietly
// produced eight screenshots of chromium's "site can't be reached" page:
//
//  1. node CANNOT open a TCP connection to 127.0.0.1 here — a fetch/http.get at a
//     server it just spawned itself comes back ECONNREFUSED. Chromium can. So there is
//     no way to probe readiness from node; instead we watch the server's own request
//     LOG, which is proof the page was actually served.
//  2. Binding still works, so an EADDRINUSE from net.createServer is a reliable way to
//     find a free port and step over a stale server left by an earlier session.
async function freePort(from = 8171, to = 8199) {
  for (let port = from; port <= to; port++) {
    // The bind probe gets a deadline. Without one a listen() that neither errors nor
    // calls back (which happened) hangs the whole tool forever with no output.
    const ok = await new Promise(res => {
      const s = createServer();
      const done = v => { try { s.close(); } catch {} res(v); };
      const t = setTimeout(() => done(false), 600);
      s.once('error', () => { clearTimeout(t); done(false); });
      s.listen(port, '127.0.0.1', () => { clearTimeout(t); done(true); });
    });
    if (ok) return port;
  }
  return 0;
}

const PORT = await freePort();
if (!PORT) { console.error('no free port in 8171-8199'); process.exit(1); }
const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: process.cwd(), stdio: ['ignore', 'ignore', 'pipe'] });
let hits = 0;
srv.stderr.on('data', d => { hits += (String(d).match(/"GET /g) || []).length; });
// FIVE seconds, not one. Measured: with a 1.2s wait chromium gets ECONNREFUSED every
// time and screenshots the error page; with 5s the server logs every request. Since
// node can't probe the port itself (see above), this wait is the only handle there is.
await new Promise(r => setTimeout(r, 5000));
console.log('serving on', PORT);

let failures = 0;
for (const sec of at) {
  const out = `${OUT}/at${sec}.png`;
  const before = hits;
  try {
    execFileSync('chromium', [
      '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader',
      '--hide-scrollbars', '--no-sandbox', `--window-size=${SIZE}`,
      '--virtual-time-budget=2500', `--screenshot=${out}`,
      // 127.0.0.1, not localhost: localhost resolves to IPv6 here and python's
      // http.server binds IPv4, so you get ERR_CONNECTION_REFUSED with a live server.
      `http://127.0.0.1:${PORT}/?auto&at=${sec}${EXTRA}`,
    ], { stdio: 'pipe', timeout: 180000 });
  } catch (e) {
    // Chromium exits non-zero over harmless vaapi/GL driver complaints while still
    // writing a perfectly good screenshot, so its exit code is not the test.
  }
  await new Promise(r => setTimeout(r, 250));
  const served = hits > before;
  const wrote = existsSync(out) && statSync(out).mtimeMs > Date.now() - 180000;
  if (served && wrote) console.log('shot', sec + 's ->', out);
  else { failures++; console.log('FAILED', sec + 's — served:', served, 'wrote:', wrote); }
}
srv.kill();
if (failures) { console.error(failures + ' shot(s) failed'); process.exit(1); }
