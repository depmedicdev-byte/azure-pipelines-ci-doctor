'use strict';
const { jobs, scriptOf, makeFinding } = require('../parse');

const SECRET_LIKE = /\$\(\s*([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD|PWD|API_?KEY|CONNECTIONSTRING|CREDENTIALS|PRIVATEKEY))\s*\)/g;

module.exports = {
  id: 'inline-secret-leak',
  severity: 'warn',
  description: "Inline scripts using $(SECRET_NAME) macro syntax expand to secrets in plain text in build logs. Use the 'env:' mapping with $env:NAME / $NAME instead.",
  category: 'security',
  check(parsed) {
    const out = [];
    const all = jobs(parsed);
    for (const j of all) {
      for (let i = 0; i < j.steps.length; i++) {
        const s = j.steps[i];
        const txt = scriptOf(s);
        if (!txt) continue;
        SECRET_LIKE.lastIndex = 0;
        const matches = new Set();
        let m;
        while ((m = SECRET_LIKE.exec(txt)) !== null) matches.add(m[1]);
        if (!matches.size) continue;
        const path = j.jobPath.length ? [...j.jobPath, 'steps', i] : ['steps', i];
        out.push(makeFinding(
          module.exports,
          parsed,
          `step uses macro $(${[...matches][0]}) which expands inline. Pass via 'env: { ${[...matches][0]}: $(${[...matches][0]}) }' and reference $env:${[...matches][0]} (PS) or $${[...matches][0]} (bash) so it stays masked.`,
          path,
        ));
      }
    }
    return out;
  },
};
