'use strict';
const { jobs, makeFinding } = require('../parse');

module.exports = {
  id: 'missing-timeout-in-minutes',
  severity: 'warn',
  description: 'Job has no timeoutInMinutes. Default is 60 min on Microsoft-hosted, 360 min on self-hosted; a runaway job can burn the entire window.',
  category: 'cost',
  check(parsed) {
    const out = [];
    const all = jobs(parsed);
    for (const j of all) {
      if (typeof j.job.timeoutInMinutes !== 'undefined') continue;
      if (!j.job.job && !j.job.steps) continue; // anonymous wrapper
      const path = j.jobPath.length ? j.jobPath.slice() : [];
      out.push(makeFinding(
        module.exports,
        parsed,
        `job '${j.job.job || '<anonymous>'}' has no timeoutInMinutes. Add 'timeoutInMinutes: 15' (or whatever's realistic) so a hang can't burn 60+ paid minutes.`,
        path,
      ));
    }
    return out;
  },
};
