// propshot.mjs — headless shots of props.html, one per landmark.
//
//   node tools/propshot.mjs 0 4 9        the 1st, 5th and 10th landmarks
//   node tools/propshot.mjs              all of them
//   PS_BACK=1 node tools/propshot.mjs 3  looking back up the road at it
//
// Why this exists rather than tools/shot.mjs: shot.mjs drives the real game through
// ?auto, and the auto-driver puts it in a wall somewhere in the village, so anything
// past about two minutes can never be photographed that way. This bench has no physics
// — it just stands on the road at a given metre — so every landmark is reachable and
// each frame costs a page load instead of a simulated lap.
//
// The two environment facts from shot.mjs still apply and are why this looks the way it
// does: node cannot open a TCP connection to 127.0.0.1 here (so readiness is judged by
// watching the server's own request log), and `localhost` resolves to IPv6 while
// python's http.server binds IPv4.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:net';

const OUT = process.env.SHOT_DIR || '/tmp/rallyprops';
const SIZE = process.env.SHOT_SIZE || '900,420';
const BACK = process.env.PS_BACK === '1' ? '&back=1' : '';
const LOCK = process.env.PS_LOCK === '1' ? '&lock=1' : '';
// PS_PAGE + PS_URL shoot any page in the repo, not just the props bench — one server,
// one chromium, same two environment workarounds.
const PAGE = process.env.PS_PAGE || 'props.html';
const URLS = (process.env.PS_URL || '').split('|').filter(Boolean);

const { Stage, SEGMENTS } = await import('../js/stage.js');
const stage = new Stage();
const marks = [];
SEGMENTS.forEach((seg, si) => {
  if (!seg.mark) return;
  const d0 = stage.segStartDist(si);
  for (const mk of seg.mark) marks.push({ at: d0 + seg.len * (mk.t ?? 0.5), k: mk.k });
});
marks.sort((a, b) => a.at - b.at);

// PS_AT is a comma-separated list of METRES — for standing somewhere that isn't a
// landmark at all, which is how you check that a thing reads from where you'd see it
// rather than from the arbitrary 35m the arrows use.
const AT = (process.env.PS_AT || '').split(',').map(Number).filter(n => n > 0);
const args = process.argv.slice(2).map(Number).filter(n => !Number.isNaN(n));
const want = URLS.length ? URLS.map(q => ({ q })) : AT.length ? AT.map(m => ({ m })) : (args.length ? args : marks.map((_, i) => i));
mkdirSync(OUT, { recursive: true });

async function freePort(from = 8171, to = 8199) {
  for (let port = from; port <= to; port++) {
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
const srv = spawn('python3', ['-m', 'http.server', String(PORT)],
                  { cwd: process.cwd(), stdio: ['ignore', 'ignore', 'pipe'] });
let hits = 0;
srv.stderr.on('data', d => { hits += (String(d).match(/"GET /g) || []).length; });
await new Promise(r => setTimeout(r, 5000));
console.log('serving on', PORT);

let failures = 0;
for (const n of want) {
  const raw = typeof n === 'object' && n.q !== undefined;
  const metres = typeof n === 'object' && n.m !== undefined;
  const mk = raw ? { at: 0, k: n.q } : metres ? { at: n.m, k: 'at' } : marks[n];
  if (!mk) { console.log('no landmark', n); continue; }
  const out = raw ? `${OUT}/${n.q.replace(/[^a-z0-9]+/gi, '_')}.png`
            : metres ? `${OUT}/at${n.m}${LOCK ? 'L' : ''}.png`
                     : `${OUT}/${String(n).padStart(2, '0')}-${mk.k}.png`;
  const query = raw ? n.q : metres ? `at=${n.m}` : `mark=${n}`;
  const before = hits;
  try {
    execFileSync('chromium', [
      '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader',
      '--hide-scrollbars', '--no-sandbox', `--window-size=${SIZE}`,
      '--virtual-time-budget=9000', `--screenshot=${out}`,
      `http://127.0.0.1:${PORT}/${PAGE}?${query}${BACK}${LOCK}`,
    ], { stdio: 'pipe', timeout: 300000 });
  } catch { /* chromium exits non-zero over GL driver noise and still writes the png */ }
  await new Promise(r => setTimeout(r, 200));
  const ok = hits > before && existsSync(out) && statSync(out).mtimeMs > Date.now() - 300000;
  console.log(ok ? 'shot' : 'FAILED', mk.k, Math.round(mk.at) + 'm', ok ? '-> ' + out : '');
  if (!ok) failures++;
}
srv.kill();
if (failures) process.exit(1);
