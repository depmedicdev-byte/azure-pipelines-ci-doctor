'use strict';

function renderMarkdown(findings) {
  if (!findings.length) return '## gitlab-ci-doctor\n\nNo issues found.';
  const out = ['## gitlab-ci-doctor findings', ''];
  out.push('| File | Line | Severity | Rule | Message |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const f of findings) {
    const msg = String(f.message).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    out.push(`| ${f.filename} | ${f.line} | ${f.severity} | ${f.ruleId} | ${msg} |`);
  }
  return out.join('\n');
}

module.exports = { renderMarkdown };
