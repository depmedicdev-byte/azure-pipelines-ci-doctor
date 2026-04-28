'use strict';
const { makeFinding } = require('../parse');

function isWide(trigger) {
  if (trigger === undefined) return false;
  if (trigger === 'none') return false;
  if (trigger === true || trigger === null) return true;
  if (typeof trigger === 'string') return true;
  if (Array.isArray(trigger)) return trigger.length === 0;
  if (typeof trigger === 'object') {
    const hasBranches = trigger.branches && (trigger.branches.include || trigger.branches.exclude);
    const hasPaths = trigger.paths && (trigger.paths.include || trigger.paths.exclude);
    return !hasBranches && !hasPaths;
  }
  return false;
}

module.exports = {
  id: 'wide-trigger',
  severity: 'warn',
  description: 'trigger or pr is unscoped (no branches.include or paths.include). Pipeline runs on every push to every branch including draft PRs.',
  category: 'cost',
  check(parsed) {
    const out = [];
    const data = parsed.data || {};
    if (Object.prototype.hasOwnProperty.call(data, 'trigger') && isWide(data.trigger)) {
      out.push(makeFinding(
        module.exports,
        parsed,
        "trigger is unscoped. Add 'trigger: { branches: { include: [main] }, paths: { include: [src/**] } }' so non-source pushes don't burn minutes.",
        ['trigger'],
      ));
    }
    if (Object.prototype.hasOwnProperty.call(data, 'pr') && isWide(data.pr)) {
      out.push(makeFinding(
        module.exports,
        parsed,
        "pr trigger is unscoped. Add 'pr: { branches: { include: [main] }, paths: { include: [src/**] } }' so doc/comment-only PRs don't run the build.",
        ['pr'],
      ));
    }
    return out;
  },
};
