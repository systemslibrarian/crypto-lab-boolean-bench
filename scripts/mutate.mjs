#!/usr/bin/env node
/*
 * Mutation runner (§4.1c). Every mutation is a CONCRETE PATCH — file, an anchor
 * that must occur exactly once, its replacement — never a sentence. A KILL is
 * defined by four rules, all enforced here:
 *   1. the owning test PASSED unmutated, in this same run;
 *   2. the patch actually CHANGED the file (anchor found exactly once);
 *   3. the run served the MUTATED code — the built bundle's hash moved;
 *   4. a patch that does not compile is DOES NOT BUILD, never a kill.
 * A red run whose output is a build error, a server that never started or a
 * refused connection is classified, not counted. Playwright runs with CI=1 so
 * `reuseExistingServer` is off and no stale server can answer.
 *
 * The records in mutations/observed.json are written by this script from what
 * it ran. Nothing in that file is typed by hand.
 *
 * Usage: node scripts/mutate.mjs            all mutations
 *        node scripts/mutate.mjs M03 M07    selected ids
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Both runners treat the name as a REGULAR EXPRESSION. An unescaped "[00]" in a
// test name once matched nothing, ran zero tests and passed — the §4.1e hazard —
// so names are escaped here AND every owner run must report a nonzero count.
const re = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const UNIT = (name) => `npx vitest run -t ${JSON.stringify(re(name))}`;
const CLAIM = (name) => `npx playwright test --project=claims -g ${JSON.stringify(re(name))}`;
const A11Y = `npx playwright test --project=a11y -g "dark theme$"`;

export const MUTATIONS = [
  {
    id: 'M01', what: 'Walsh count uses AND instead of XOR of b·S(x) and a·x',
    file: 'src/boolean/walsh.ts',
    anchor: 'if (parity(b & s.table[x]) === parity(a & x)) agree++;',
    replace: 'if ((parity(b & s.table[x]) & parity(a & x)) === 0) agree++;',
    owner: UNIT('counting agreements minus disagreements equals the butterfly'),
  },
  {
    id: 'M02', what: 'NL formula drops the /2',
    file: 'src/boolean/walsh.ts',
    anchor: 'return { nl: (1 << (s.n - 1)) - value / 2, maxW: value, at };',
    replace: 'return { nl: (1 << (s.n - 1)) - value, maxW: value, at };',
    owner: UNIT('NL = 112 with max |W| = 32'),
  },
  {
    id: 'M03', what: 'DDT counts row a = 0',
    file: 'src/boolean/ddt.ts',
    anchor: 'for (let a = 1; a < 1 << s.n; a++) {\n    const row = ddtRow(s, a);',
    replace: 'for (let a = 0; a < 1 << s.n; a++) {\n    const row = ddtRow(s, a);',
    owner: UNIT('NL = 112 with max |W| = 32'),
  },
  {
    id: 'M04', what: 'Möbius transform folds the wrong half (degree changes for AES)',
    file: 'src/boolean/anf.ts',
    anchor: 'if (x & h) c[x] ^= c[x ^ h];',
    replace: 'if (!(x & h)) c[x] ^= c[x ^ h];',
    owner: UNIT('NL = 112 with max |W| = 32'),
  },
  {
    id: 'M05', what: 'AES affine constant 0x63 omitted',
    file: 'src/sboxes/aes.ts',
    anchor: 'for (let x = 0; x < 256; x++) t.push(aesAffine(gfInv(AES_FIELD, x)));',
    replace: 'for (let x = 0; x < 256; x++) t.push(aesAffine(gfInv(AES_FIELD, x), 0));',
    owner: UNIT('generated table: S[00] = 63'),
  },
  {
    id: 'M06', what: 'vectorial NL takes the max over masks instead of the min',
    file: 'src/boolean/walsh.ts',
    anchor: 'if (c.nl < best.nl) best =',
    replace: 'if (best.nl === Infinity || c.nl > best.nl) best =',
    owner: UNIT('vectorial NL is the MINIMUM over nonzero masks'),
  },
  {
    id: 'M07', what: 'negative-claim sentence deleted from the Gold fixture',
    file: 'src/ui/comparePanel.ts',
    anchor: "'A perfect score here is not a secure cipher. Nonlinearity",
    replace: "'Nonlinearity",
    owner: CLAIM('the negative claim: the APN Gold map scores optimal'),
  },
  {
    id: 'M08', what: 'a check inside the fixture broken: δ must be strictly below the bound to count as optimal',
    file: 'src/boolean/metrics.ts',
    anchor: 'const meets = r.delta <= bound;',
    replace: 'const meets = r.delta < bound;',
    owner: CLAIM('the negative claim: the APN Gold map scores optimal'),
  },
  {
    id: 'M09', what: 'editing the table no longer retires the old measurements',
    file: 'src/ui/comparePanel.ts',
    anchor: "    clear(editorOut);\n    editorOut.append(evidenceRetired(",
    replace: "    editorOut.append(evidenceRetired(",
    owner: CLAIM('editing the table retires the measurements'),
  },
  {
    id: 'M10', what: 're-selecting the same S-box re-renders (no-op guard removed)',
    file: 'src/ui/picker.ts',
    anchor: '    if (select.value === currentId) return;\n',
    replace: '',
    owner: CLAIM('re-selecting the same S-box does not retire a current result'),
  },
  {
    id: 'M11', what: 'toy-cipher key recovery forgets to XOR the plaintext back out',
    file: 'src/boolean/toycipher.ts',
    anchor: 'return invert(s)[c] ^ p;',
    replace: 'return invert(s)[c] ^ (p >> s.n);', // p < 2^n, so this drops p and still compiles
    owner: CLAIM('the toy cipher: the recovered key really re-encrypts'),
  },
  {
    id: 'M12', what: 'gate bite: muted text token darkened below 4.5:1',
    file: 'src/style.css',
    anchor: '--text-dim: #b3bdc8;',
    replace: '--text-dim: #4a525c;',
    owner: A11Y,
  },
];

const sh = (cmd) => {
  try {
    return { ok: true, out: execSync(cmd, { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, CI: '1' }, maxBuffer: 64 << 20 }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};
const bundleHash = () => {
  const dir = join('dist', 'assets');
  const h = createHash('md5');
  for (const f of readdirSync(dir).sort()) h.update(f).update(readFileSync(join(dir, f)));
  return h.digest('hex');
};
/** Tests actually executed, from the runner's own summary line; 0 means the run proved nothing. */
const testsRan = (out) => {
  const v = /Tests\s+(?:\d+ failed \| )?(\d+) passed/.exec(out) ?? /Tests\s+(\d+) failed/.exec(out);
  const p = /(\d+) passed \(/.exec(out) ?? /(\d+) failed/.exec(out);
  return Number((v ?? p)?.[1] ?? 0);
};
const INFRA = /webServer|ECONNREFUSED|was not able to start|Error: Cannot find module|error TS\d+/;

const wanted = process.argv.slice(2);
const list = wanted.length ? MUTATIONS.filter((m) => wanted.includes(m.id)) : MUTATIONS;

const build0 = sh('npm run build');
if (!build0.ok) throw new Error('baseline build fails; refusing to mutate');
const baseHash = bundleHash();
const ownerBaseline = new Map();
for (const owner of new Set(list.map((m) => m.owner))) {
  const r = sh(owner);
  const n = testsRan(r.out);
  ownerBaseline.set(owner, r.ok && n > 0);
  console.log(`baseline ${r.ok ? 'PASS' : 'FAIL'} (${n} test${n === 1 ? '' : 's'})  ${owner}`);
}

const records = [];
for (const m of list) {
  const src = readFileSync(m.file, 'utf8');
  const count = src.split(m.anchor).length - 1;
  const rec = { id: m.id, what: m.what, file: m.file, owner: m.owner, ownerPassedUnmutated: ownerBaseline.get(m.owner) };
  if (count !== 1) {
    records.push({ ...rec, result: `ANCHOR FOUND ${count} TIMES` });
    console.log(`${m.id} ANCHOR FOUND ${count} TIMES`);
    continue;
  }
  const mutated = src.replace(m.anchor, m.replace);
  writeFileSync(m.file, mutated);
  try {
    const b = sh('npm run build');
    if (!b.ok) {
      records.push({ ...rec, result: 'DOES NOT BUILD' });
      console.log(`${m.id} DOES NOT BUILD`);
      continue;
    }
    const h = bundleHash();
    const t = sh(m.owner);
    const infra = !t.ok && INFRA.test(t.out);
    const killed = rec.ownerPassedUnmutated && h !== baseHash && !t.ok && !infra;
    const result = killed ? 'KILLED' : infra ? 'INCONCLUSIVE (infrastructure failure)' : h === baseHash ? 'INCONCLUSIVE (bundle unchanged)' : 'SURVIVED';
    const failLine = t.out.split('\n').find((l) => /✘|FAIL|AssertionError|Expected|expect\(/.test(l)) ?? '';
    records.push({ ...rec, bundleHashChanged: h !== baseHash, ownerFailedMutated: !t.ok, result, evidence: failLine.trim().slice(0, 240) });
    console.log(`${m.id} ${result}  ${m.what}`);
  } finally {
    writeFileSync(m.file, src);
  }
}
const restored = sh('npm run build');
const restoredHash = restored.ok ? bundleHash() : 'BUILD FAILED';
const summary = {
  ranAt: new Date().toISOString(),
  baselineBundle: baseHash,
  restoredBundleMatches: restoredHash === baseHash,
  killed: records.filter((r) => r.result === 'KILLED').length,
  total: records.length,
  records,
};
mkdirSync('mutations', { recursive: true });
if (!wanted.length) writeFileSync('mutations/observed.json', JSON.stringify(summary, null, 2) + '\n');
console.log(`\n${summary.killed}/${summary.total} killed; restored bundle matches baseline: ${summary.restoredBundleMatches}`);
if (summary.killed !== summary.total || !summary.restoredBundleMatches) process.exit(1);
