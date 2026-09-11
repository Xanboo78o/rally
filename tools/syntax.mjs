// syntax.mjs — does every module actually PARSE as a module?
//
//   node tools/syntax.mjs
//
// `node --check file.js` parses as CommonJS, which is not what the browser does, and it
// happily accepted a stray closing brace that made main.js throw on load — the game
// shipped broken because the check that was supposed to catch it was checking the wrong
// language. Importing each module is the only honest test, and it's instant.
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const dir = new URL('../js/', import.meta.url);
let bad = 0;
for (const f of readdirSync(dir).filter(n => n.endsWith('.js')).sort()) {
  try {
    await import(new URL(f, dir));
    console.log(' ok  ' + f);
  } catch (e) {
    // A module that needs a DOM is fine — it PARSED. Only a SyntaxError is a failure.
    if (e instanceof SyntaxError) { console.log('FAIL ' + f + '  ' + e.message); bad++; }
    else console.log(' ok  ' + f + '   (parsed; needs a browser to run: ' + e.constructor.name + ')');
  }
}
if (bad) { console.log('\n' + bad + ' file(s) will not load in a browser'); process.exit(1); }
