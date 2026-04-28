'use strict';
const { jobs, makeFinding } = require('../parse');

module.exports = {
  id: 'unbounded-parallelism',
  severity: 'warn',
  description: 'Job uses strategy.parallel >= 5 without maxParallel cap. Will burn the full parallelism budget and may queue when other pipelines need it.',
  category: 'cost',
  check(parsed) {
    const out = [];
    const all = jobs(parsed);
    for (const j of all) {
      const strat = j.job.strategy;
      if (!strat || typeof strat !== 'object') continue;
      const par = strat.parallel;
      const maxPar = strat.maxParallel;
      if (typeof par === 'number' && par >= 5 && typeof maxPar === 'undefined') {
        const path = j.jobPath.length ? [...j.jobPath, 'strategy', 'parallel'] : ['strategy', 'parallel'];
        out.push(makeFinding(
          module.exports,
          parsed,
          `strategy.parallel = ${par} without maxParallel. Set 'maxParallel: 3' (or whatever your concurrent free agent count is) so this pipeline can't starve others.`,
          path,
        ));
      }
      // matrix without maxParallel + many entries
      const matrix = strat.matrix;
      if (matrix && typeof matrix === 'object' && !Array.isArray(matrix)) {
        const count = Object.keys(matrix).length;
        if (count >= 5 && typeof maxPar === 'undefined') {
          const path = j.jobPath.length ? [...j.jobPath, 'strategy', 'matrix'] : ['strategy', 'matrix'];
          out.push(makeFinding(
            module.exports,
            parsed,
            `strategy.matrix has ${count} legs without maxParallel. Set 'maxParallel: 3' to bound concurrent agent use.`,
            path,
          ));
        }
      }
    }
    return out;
  },
};
