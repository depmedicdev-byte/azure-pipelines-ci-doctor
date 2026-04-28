'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { auditPipeline, summarize, rules } = require('../src/index');

function audit(yaml, opts = {}) {
  return auditPipeline(yaml, 'azure-pipelines.yml', opts);
}
const ids = (fs) => fs.map((f) => f.ruleId).sort();

test('demo file fires every rule', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'examples', 'bad-azure-pipelines.yml'), 'utf8');
  const f = audit(src);
  const got = new Set(ids(f));
  for (const r of rules) {
    assert.ok(got.has(r.id), `expected rule ${r.id} to fire on demo file. got: ${[...got].join(', ')}`);
  }
});

test('clean pipeline produces zero findings', () => {
  const src = `trigger:
  branches:
    include: [main]
  paths:
    include: [src/**]

pr:
  branches:
    include: [main]
  paths:
    include: [src/**]

stages:
  - stage: Build
    jobs:
      - job: clean
        timeoutInMinutes: 15
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: Cache@2
            inputs:
              key: 'npm | "$(Agent.OS)" | package-lock.json'
              path: ~/.npm
          - task: UseNode@2
            inputs:
              version: '20.x'
          - script: npm ci && npm test
`;
  const f = audit(src);
  assert.deepEqual(f, [], 'unexpected findings: ' + JSON.stringify(f, null, 2));
});

test('rule metadata is well-formed', () => {
  for (const r of rules) {
    assert.ok(r.id);
    assert.match(r.severity, /^(error|warn|info)$/);
    assert.ok(r.description);
    assert.ok(typeof r.check === 'function');
  }
});

test('summarize counts severities', () => {
  const f = audit(`pool:
  vmImage: 'macOS-latest'
steps:
  - script: npm ci
`);
  const s = summarize(f);
  assert.equal(s.total, f.length);
  assert.ok(s.warn >= 1);
});

test('inline-secret-leak fires on $(SECRET) macro', () => {
  const f = audit(`pool: { vmImage: 'ubuntu-latest' }
jobs:
  - job: leak
    timeoutInMinutes: 5
    steps:
      - script: |
          curl -H "Authorization: Bearer $(GITHUB_TOKEN)" https://api.example.com
`);
  assert.ok(f.some((x) => x.ruleId === 'inline-secret-leak'), 'expected inline-secret-leak finding: ' + JSON.stringify(f, null, 2));
});
