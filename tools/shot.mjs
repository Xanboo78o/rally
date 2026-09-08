// shot.mjs — headless screenshots of the running game, so the render path can be
// checked without a phone in hand.  node tools/shot.mjs [ms ...]
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.env.SHOT_DIR || '/tmp/rallyshots';
const PORT = 8171;
const budgets = process.argv.slice(2).map(Number).filter(Boolean);
const times = budgets.length ? budgets : [4000, 16000, 28000, 34000];

mkdirSync(OUT, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));

for (const ms of times) {
  const out = `${OUT}/t${ms}.png`;
  try {
    execFileSync('chromium', [
      '--headless=new', '--disable-gpu', '--enable-unsafe-swiftshader',
      '--hide-scrollbars', '--no-sandbox', '--window-size=900,460',
      `--virtual-time-budget=${ms}`, `--screenshot=${out}`,
      `http://127.0.0.1:${PORT}/?auto`,
    ], { stdio: 'pipe', timeout: 120000 });
    console.log('shot', ms + 'ms ->', out);
  } catch (e) {
    console.log('FAILED at', ms, String(e.stderr || e).slice(0, 400));
  }
}
srv.kill();
