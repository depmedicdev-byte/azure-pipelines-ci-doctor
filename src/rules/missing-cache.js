'use strict';
const { jobs, scriptOf, makeFinding } = require('../parse');

const MGRS = [
  { id: 'npm',     re: /\bnpm\s+(ci|install|i\b)/, key: 'npm | yarn.lock' },
  { id: 'yarn',    re: /\byarn\s+install/, key: 'yarn | yarn.lock' },
  { id: 'pnpm',    re: /\bpnpm\s+install/, key: 'pnpm | pnpm-lock.yaml' },
  { id: 'pip',     re: /\bpip\s+install/, key: 'pip | requirements.txt' },
  { id: 'poetry',  re: /\bpoetry\s+install/, key: 'poetry | poetry.lock' },
  { id: 'maven',   re: /\bmvn\b/, key: 'maven | pom.xml' },
  { id: 'gradle',  re: /\bgradle\b|\.\/gradlew\b/, key: 'gradle | **/*.gradle*' },
  { id: 'cargo',   re: /\bcargo\s+(build|test|fetch)/, key: 'cargo | Cargo.lock' },
  { id: 'go',      re: /\bgo\s+(get|mod|build|test)/, key: 'go | go.sum' },
  { id: 'bundler', re: /\bbundle\s+install/, key: 'bundler | Gemfile.lock' },
];

function hasCacheTask(steps) {
  for (const s of steps) {
    if (!s || typeof s !== 'object') continue;
    if (typeof s.task === 'string' && /^Cache@\d+$/i.test(s.task)) return true;
    if (typeof s.task === 'string' && /^CacheBeta@\d+$/i.test(s.task)) return true;
    if (typeof s.task === 'string' && /Restore.*Cache|RestoreCache@\d+/i.test(s.task)) return true;
  }
  return false;
}

module.exports = {
  id: 'missing-cache',
  severity: 'warn',
  description: 'Job runs npm/pip/maven/gradle/cargo/go/bundler install but has no Cache@2 task. Re-downloads dependencies on every run.',
  category: 'cost',
  check(parsed) {
    const out = [];
    const all = jobs(parsed);
    for (const j of all) {
      if (hasCacheTask(j.steps)) continue;
      const allScript = j.steps.map(scriptOf).join('\n');
      const hits = MGRS.filter((m) => m.re.test(allScript));
      if (!hits.length) continue;
      const path = j.jobPath.length ? [...j.jobPath, 'steps'] : ['steps'];
      out.push(makeFinding(
        module.exports,
        parsed,
        `job '${j.job.job || '<anonymous>'}' runs ${hits.map((h) => h.id).join('+')} install but no Cache@2 task. Add: '- task: Cache@2' with key '${hits[0].key}'.`,
        path,
      ));
    }
    return out;
  },
};
