/* Build real daisyUI components, scoped and bound to Harness theme tokens. */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import prefixSelector from 'postcss-prefix-selector';
const base = dirname(fileURLToPath(import.meta.url));
const path = join(base, 'client.js');
const client = await readFile(path, 'utf8');
const start = '    /* SALAH_CSS_START */', end = '    /* SALAH_CSS_END */';
const first = client.indexOf(start), last = client.indexOf(end);
if (first < 0 || last <= first) throw new Error('Missing CSS markers.');
const authored = client.slice(0, first) + client.slice(last + end.length);
const candidates = [...new Set(authored.match(/\bsl-[a-z][a-z0-9-]*\b/g) || [])].sort();
const input = (await readFile(join(base, 'ui.css'), 'utf8')).replace("@source './client.js';", `@source inline(${JSON.stringify(candidates.join(' '))});`);
// Resolve the CLI's exported manifest rather than POSIX/.cmd launch wrappers.
// Passing separate argv entries to Node also preserves paths containing spaces.
const require = createRequire(import.meta.url);
const cliManifestPath = require.resolve('@tailwindcss/cli/package.json');
const cliManifest = JSON.parse(await readFile(cliManifestPath, 'utf8'));
const cliBin = typeof cliManifest.bin === 'string' ? cliManifest.bin : cliManifest.bin?.tailwindcss;
if (typeof cliBin !== 'string' || !cliBin) throw new Error('The installed @tailwindcss/cli package has no tailwindcss bin.');
const cliPath = join(dirname(cliManifestPath), cliBin);
const build = spawnSync(process.execPath, [cliPath, '--input', '-', '--minify'], { cwd: base, input, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 * 10, shell: false });
if (build.error || build.status !== 0) throw new Error(`CSS build failed (exit ${build.status ?? 'unavailable'}${build.signal ? `, signal ${build.signal}` : ''}): ${build.error?.message || build.stderr || 'No compiler diagnostics.'}`);
const root = postcss.parse(build.stdout);
const layers = [];
root.walkAtRules('layer', rule => layers.push(rule));
for (const rule of layers.reverse()) {
  if (['base', 'theme', 'properties'].includes(rule.params) || !rule.nodes) rule.remove();
  else rule.replaceWith(rule.nodes);
}
root.walkAtRules('property', rule => rule.remove());
root.walkAtRules(/(?:^|-)keyframes$/, rule => rule.remove());
root.walkDecls(/^(?:-\w+-)?animation(?:-|$)/, decl => decl.remove());
function semanticColors(value, replacement) {
  const functions = /\b(?:oklch|oklab|rgba?|hsla?|hwb|lab|lch)\(/gi;
  let match;
  while ((match = functions.exec(value))) {
    let depth = 1, cursor = functions.lastIndex;
    while (cursor < value.length && depth) { if (value[cursor] === '(') depth++; if (value[cursor] === ')') depth--; cursor++; }
    if (depth) throw new Error('Unbalanced CSS color.');
    value = value.slice(0, match.index) + replacement + value.slice(cursor);
    functions.lastIndex = match.index + replacement.length;
  }
  return value;
}
root.walkDecls(decl => {
  const replacement = /shadow|inset/.test(decl.prop) ? 'transparent' : 'var(--dsw-alias-label-primary)';
  decl.value = semanticColors(decl.value, replacement)
    .replace(/#[0-9a-f]{3,8}\b/gi, color => /^#(?:0000|00000000)$/i.test(color) ? 'transparent' : /^#(?:fff|ffffff)$/i.test(color) ? 'var(--dsw-alias-bg-base)' : replacement)
    .replace(/\bblack\b/gi, replacement).replace(/\bwhite\b/gi, 'var(--dsw-alias-bg-base)');
});
root.walkAtRules('supports', rule => { rule.params = rule.params.replace(/\bred\b/g, 'currentColor'); });
const scoped = await postcss([prefixSelector({ prefix: '.salah', transform(prefix, selector, prefixed, file, rule) {
  for (let parent = rule.parent; parent; parent = parent.parent) if (parent.type === 'rule') return selector;
  if (selector.startsWith('.salah')) return selector;
  if ([':root', ':host', 'html', 'body'].includes(selector)) return prefix;
  return prefixed;
} })]).process(root, { from: undefined });
const css = scoped.css + '\n' + await readFile(join(base, 'styles.css'), 'utf8');
const check = postcss.parse(css);
check.walkAtRules(rule => { if (/^(?:import|property|theme|source|plugin|tailwind|layer|(?:\w+-)?keyframes)$/.test(rule.name)) throw new Error(`Unexpected @${rule.name}`); });
check.walkRules(rule => {
  for (let parent = rule.parent; parent; parent = parent.parent) if (parent.type === 'rule') return;
  if (postcss.list.comma(rule.selector).some(selector => !selector.trim().startsWith('.salah'))) throw new Error(`Unscoped CSS: ${rule.selector}`);
});
check.walkDecls(decl => { if (/#[0-9a-f]{3,8}\b|\b(?:oklch|oklab|rgba?|hsla?|hwb|lab|lch)\(/i.test(decl.value)) throw new Error(`Literal color in ${decl.prop}`); });
await writeFile(path, client.slice(0, first) + start + '\n    const CSS = ' + JSON.stringify(css) + ';\n' + client.slice(last));
console.log(`Embedded ${Buffer.byteLength(css)} bytes of scoped, host-themed daisyUI CSS.`);
