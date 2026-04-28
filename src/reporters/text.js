'use strict';

const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, str) => (COLOR ? `\x1b[${code}m${str}\x1b[0m` : str);
const RED = (s) => c('31', s);
const YELLOW = (s) => c('33', s);
const CYAN = (s) => c('36', s);
const DIM = (s) => c('2', s);
const BOLD = (s) => c('1', s);

function sevColor(sev) {
  if (sev === 'error') return RED('error');
  if (sev === 'warn') return YELLOW('warn');
  return CYAN('info');
}

function renderText(findings) {
  if (!findings.length) return BOLD('No issues found.') + '\n' + DIM('All checked rules passed.');
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.filename)) byFile.set(f.filename, []);
    byFile.get(f.filename).push(f);
  }
  const out = [];
  for (const [file, list] of byFile) {
    out.push(BOLD(file));
    list.sort((a, b) => a.line - b.line);
    for (const f of list) {
      out.push(`  ${DIM(`${f.line}:${f.column}`)}  ${sevColor(f.severity)}  ${f.ruleId}  ${f.message}`);
      if (f.suggestion) {
        out.push(DIM('    suggestion:'));
        for (const ln of String(f.suggestion).split('\n')) out.push(DIM(`      ${ln}`));
      }
    }
    out.push('');
  }
  const counts = findings.reduce(
    (a, f) => ((a[f.severity] = (a[f.severity] || 0) + 1), a),
    { error: 0, warn: 0, info: 0 }
  );
  out.push(
    `${BOLD('summary:')} ${RED(counts.error + ' error')}, ${YELLOW(counts.warn + ' warn')}, ${CYAN(counts.info + ' info')}`
  );
  return out.join('\n');
}

module.exports = { renderText };
