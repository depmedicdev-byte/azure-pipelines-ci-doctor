'use strict';

const YAML = require('yaml');

function parseAzurePipelines(source, filename) {
  const lineCounter = new YAML.LineCounter();
  const doc = YAML.parseDocument(source, { keepSourceTokens: true, lineCounter });
  doc.lineCounter = lineCounter;
  const errors = doc.errors.map((e) => ({
    severity: 'error',
    ruleId: 'parse-error',
    message: e.message,
    line: e.linePos ? e.linePos[0].line : 1,
    column: e.linePos ? e.linePos[0].col : 1,
    filename,
  }));
  const data = doc.toJS({ maxAliasCount: -1 }) || {};
  return { doc, data, errors, filename };
}

// Azure Pipelines YAML normalises to one of:
//   stages: [{ stage, jobs: [{ job, steps: [...] }] }]
//   jobs:   [{ job, steps: [...] }]
//   steps:  [...]                        (single implicit job)
// pool may live at root, stage, or job level. This walker yields every job
// with its steps and the inherited pool / container, as { jobPath, job, steps, pool, container }.
function jobs(parsed) {
  const out = [];
  const root = parsed.data || {};
  const rootPool = root.pool;
  const rootContainer = root.container;

  function visitJob(jobPath, job, inheritedPool, inheritedContainer) {
    if (!job || typeof job !== 'object') return;
    const pool = job.pool || inheritedPool;
    const container = job.container || inheritedContainer;
    const steps = Array.isArray(job.steps) ? job.steps : [];
    out.push({ jobPath, job, steps, pool, container });
  }

  if (Array.isArray(root.stages)) {
    for (let si = 0; si < root.stages.length; si++) {
      const stage = root.stages[si];
      if (!stage || typeof stage !== 'object') continue;
      const stagePool = stage.pool || rootPool;
      const stageContainer = stage.container || rootContainer;
      const sJobs = Array.isArray(stage.jobs) ? stage.jobs : [];
      for (let ji = 0; ji < sJobs.length; ji++) {
        visitJob(['stages', si, 'jobs', ji], sJobs[ji], stagePool, stageContainer);
      }
    }
  } else if (Array.isArray(root.jobs)) {
    for (let ji = 0; ji < root.jobs.length; ji++) {
      visitJob(['jobs', ji], root.jobs[ji], rootPool, rootContainer);
    }
  } else if (Array.isArray(root.steps)) {
    visitJob([], { steps: root.steps, pool: rootPool, container: rootContainer }, rootPool, rootContainer);
  }
  return out;
}

function nodeAt(doc, pathParts) {
  let node = doc.contents;
  for (const part of pathParts) {
    if (!node) return null;
    if (typeof part === 'number' && node.items) {
      node = node.items[part];
    } else if (node.items) {
      const pair = node.items.find((p) => p.key && (p.key.value === part || p.key.source === part));
      node = pair ? pair.value : null;
    } else {
      return null;
    }
  }
  return node;
}

function lineOf(doc, pathParts) {
  const node = nodeAt(doc, pathParts);
  if (!node || !node.range) return { line: 1, column: 1 };
  const lc = doc.lineCounter ? doc.lineCounter.linePos(node.range[0]) : null;
  if (lc) return { line: lc.line, column: lc.col };
  return { line: 1, column: 1 };
}

function makeFinding(rule, parsed, message, pathParts, extras = {}) {
  const p = lineOf(parsed.doc, pathParts);
  return {
    ruleId: rule.id,
    severity: rule.severity,
    message,
    line: p.line,
    column: p.column,
    filename: parsed.filename,
    ...extras,
  };
}

function vmImageOf(pool) {
  if (!pool) return null;
  if (typeof pool === 'string') return null;
  return pool.vmImage || null;
}

function isSelfHosted(pool) {
  if (!pool) return false;
  if (typeof pool === 'string') return true;
  return !!pool.name && !pool.vmImage;
}

function scriptOf(step) {
  if (!step || typeof step !== 'object') return '';
  return [step.script, step.bash, step.pwsh, step.powershell].filter((s) => typeof s === 'string').join('\n');
}

module.exports = {
  parseAzurePipelines,
  jobs,
  nodeAt,
  lineOf,
  makeFinding,
  vmImageOf,
  isSelfHosted,
  scriptOf,
};
