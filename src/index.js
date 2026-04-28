'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseAzurePipelines } = require('./parse');
const allRules = require('./rules');

function auditPipeline(source, filename = 'azure-pipelines.yml', options = {}) {
  const parsed = parseAzurePipelines(source, filename);
  if (parsed.errors.length) return parsed.errors;
  const enabled = filterRules(allRules, options);
  const findings = [];
  for (const rule of enabled) {
    try {
      const out = rule.check(parsed) || [];
      findings.push(...out);
    } catch (err) {
      findings.push({
        ruleId: rule.id,
        severity: 'error',
        message: `rule crashed: ${err && err.message}`,
        line: 1,
        column: 1,
        filename,
      });
    }
  }
  return findings;
}

function auditDirectory(dir, options = {}) {
  const root = path.resolve(dir);
  const files = [];
  const candidates = ['azure-pipelines.yml', 'azure-pipelines.yaml', '.azure-pipelines.yml', 'azure-pipeline.yml'];
  for (const c of candidates) {
    const p = path.join(root, c);
    if (fs.existsSync(p)) files.push(p);
  }
  if (files.length === 0) {
    if (fs.existsSync(root) && fs.statSync(root).isFile()) files.push(root);
  }
  const all = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const rel = path.relative(root, file).replace(/\\/g, '/') || path.basename(file);
    all.push(...auditPipeline(source, rel, options));
  }
  return all;
}

function filterRules(rules, options) {
  let out = rules;
  if (options.only && options.only.length) {
    const set = new Set(options.only);
    out = out.filter((r) => set.has(r.id));
  }
  if (options.disable && options.disable.length) {
    const set = new Set(options.disable);
    out = out.filter((r) => !set.has(r.id));
  }
  return out;
}

function summarize(findings) {
  const sev = { error: 0, warn: 0, info: 0 };
  for (const f of findings) sev[f.severity] = (sev[f.severity] || 0) + 1;
  return { total: findings.length, ...sev };
}

module.exports = { auditPipeline, auditDirectory, summarize, rules: allRules };
