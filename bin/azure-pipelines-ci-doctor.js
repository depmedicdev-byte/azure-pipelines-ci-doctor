#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { auditPipeline, auditDirectory, summarize } = require('../src/index');
const { renderText } = require('../src/reporters/text');
const { renderJson } = require('../src/reporters/json');
const { renderMarkdown } = require('../src/reporters/markdown');

const HELP = `azure-pipelines-ci-doctor - audit azure-pipelines.yml for waste, cost, security gaps.

Usage:
  azure-pipelines-ci-doctor [path]                 audit azure-pipelines.yml in [path] (default: cwd)
  azure-pipelines-ci-doctor --file path/to/azure-pipelines.yml
  azure-pipelines-ci-doctor --json                 machine-readable output
  azure-pipelines-ci-doctor --markdown             markdown table (PR comment friendly)
  azure-pipelines-ci-doctor --severity=warn        only warn + error
  azure-pipelines-ci-doctor --only=rule-a,rule-b   only run named rules
  azure-pipelines-ci-doctor --disable=rule-x       skip these rules
  azure-pipelines-ci-doctor --rules                list rules and exit
  azure-pipelines-ci-doctor --demo                 audit the bundled bad pipeline (smoke test)
  azure-pipelines-ci-doctor --version
  azure-pipelines-ci-doctor --help

Exit codes:
  0  no error-level findings
  1  one or more error-level findings
  2  internal error (parse failure, IO error)
`;

function parseArgs(argv) {
  const args = { positional: [], format: 'text' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--version' || a === '-V') args.version = true;
    else if (a === '--rules') args.listRules = true;
    else if (a === '--demo') args.demo = true;
    else if (a === '--json') args.format = 'json';
    else if (a === '--markdown' || a === '--md') args.format = 'markdown';
    else if (a === '--file') args.file = argv[++i];
    else if (a.startsWith('--file=')) args.file = a.slice(7);
    else if (a.startsWith('--severity=')) args.severity = a.slice(11);
    else if (a.startsWith('--only=')) args.only = a.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--disable=')) args.disable = a.slice(10).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--')) {
      console.error(`unknown flag: ${a}`);
      process.exit(2);
    } else args.positional.push(a);
  }
  return args;
}

const SEV_RANK = { info: 0, warn: 1, error: 2 };

function applySeverityFilter(findings, threshold) {
  if (!threshold) return findings;
  const min = SEV_RANK[threshold];
  if (min === undefined) return findings;
  return findings.filter((f) => (SEV_RANK[f.severity] ?? 0) >= min);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return 0; }
  if (args.version) { process.stdout.write(require('../package.json').version + '\n'); return 0; }
  if (args.listRules) {
    const { rules } = require('../src/index');
    for (const r of rules) {
      process.stdout.write(`${r.id.padEnd(28)} ${r.severity.padEnd(5)} ${(r.category || '').padEnd(11)}  ${r.description}\n`);
    }
    return 0;
  }
  let findings = [];
  try {
    if (args.demo) {
      const demo = path.join(__dirname, '..', 'examples', 'bad-azure-pipelines.yml');
      const src = fs.readFileSync(demo, 'utf8');
      findings = auditPipeline(src, 'examples/bad-azure-pipelines.yml', args);
    } else if (args.file) {
      const src = fs.readFileSync(args.file, 'utf8');
      findings = auditPipeline(src, path.relative(process.cwd(), args.file).replace(/\\/g, '/'), args);
    } else {
      const target = args.positional[0] || process.cwd();
      const stat = fs.existsSync(target) ? fs.statSync(target) : null;
      if (stat && stat.isFile()) {
        const src = fs.readFileSync(target, 'utf8');
        findings = auditPipeline(src, path.relative(process.cwd(), target).replace(/\\/g, '/'), args);
      } else {
        findings = auditDirectory(target, args);
      }
    }
  } catch (err) {
    console.error(err && err.stack ? err.stack : String(err));
    return 2;
  }
  findings = applySeverityFilter(findings, args.severity);
  if (args.format === 'json') process.stdout.write(renderJson(findings) + '\n');
  else if (args.format === 'markdown') process.stdout.write(renderMarkdown(findings) + '\n');
  else process.stdout.write(renderText(findings) + '\n');
  const s = summarize(findings);
  return s.error > 0 ? 1 : 0;
}

process.exit(main());
