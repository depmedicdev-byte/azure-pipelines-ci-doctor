'use strict';
const { jobs, makeFinding } = require('../parse');

const FLOATING = /:(latest|main|master|edge|stable|nightly|alpine|ubuntu|debian|node|python|jdk\d*|jre\d*|\d+\.\d+|\d+|\d{1,2})$/i;

function isUnpinned(ref) {
  if (typeof ref !== 'string' || !ref) return false;
  if (ref.includes('@sha256:')) return false;
  return FLOATING.test(ref) || !ref.includes(':');
}

function imageOf(container) {
  if (!container) return null;
  if (typeof container === 'string') return container;
  if (typeof container === 'object') return container.image || null;
  return null;
}

module.exports = {
  id: 'container-no-pin',
  severity: 'warn',
  description: 'Job container.image is not pinned to a digest (image@sha256:...). Floating tags break reproducibility and are a supply-chain risk.',
  category: 'security',
  check(parsed) {
    const out = [];
    const all = jobs(parsed);
    const seen = new Set();
    for (const j of all) {
      const img = imageOf(j.container);
      if (!img || !isUnpinned(img)) continue;
      const containerName = (typeof j.container === 'object' && j.container && j.container.image) ? j.container : null;
      const path = j.jobPath.length ? [...j.jobPath, 'container'] : ['container'];
      const key = j.jobPath.join('.') + '|' + img;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(makeFinding(
        module.exports,
        parsed,
        `container image '${img}' is not pinned to a digest. Pin with: image@sha256:<digest> for reproducible builds and supply-chain safety.`,
        path,
      ));
    }
    // root-level resources.containers
    const resources = (parsed.data && parsed.data.resources) || null;
    if (resources && Array.isArray(resources.containers)) {
      for (let i = 0; i < resources.containers.length; i++) {
        const c = resources.containers[i];
        const img = imageOf(c);
        if (!img || !isUnpinned(img)) continue;
        out.push(makeFinding(
          module.exports,
          parsed,
          `resources.containers[${i}].image '${img}' is not pinned to a digest.`,
          ['resources', 'containers', i, 'image'],
        ));
      }
    }
    return out;
  },
};
