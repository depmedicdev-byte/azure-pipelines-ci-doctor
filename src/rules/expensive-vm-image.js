'use strict';
const { jobs, vmImageOf, scriptOf, makeFinding } = require('../parse');

const HEAVY = /(xcodebuild|fastlane|swift\s+build|ios\b|simulator|notarize|signtool|msbuild|wix|wpf\b|vbcc|setup-msbuild)/i;

const COSTS = {
  'macos-latest': { mult: 10, name: 'macOS-latest', alt: 'ubuntu-latest unless you actually need Xcode/Swift/notarization' },
  'macos-13': { mult: 10, name: 'macOS-13', alt: 'ubuntu-latest unless you actually need Xcode/Swift/notarization' },
  'macos-12': { mult: 10, name: 'macOS-12', alt: 'ubuntu-latest unless you actually need Xcode/Swift/notarization' },
  'macos-11': { mult: 10, name: 'macOS-11', alt: 'ubuntu-latest unless you actually need Xcode/Swift/notarization' },
  'windows-latest': { mult: 2, name: 'windows-latest', alt: 'ubuntu-latest unless you actually need MSBuild/.NET Framework/PowerShell-only tools' },
  'windows-2022': { mult: 2, name: 'windows-2022', alt: 'ubuntu-latest unless you actually need MSBuild/.NET Framework/PowerShell-only tools' },
  'windows-2019': { mult: 2, name: 'windows-2019', alt: 'ubuntu-latest unless you actually need MSBuild/.NET Framework/PowerShell-only tools' },
};

module.exports = {
  id: 'expensive-vm-image',
  severity: 'warn',
  description: "Job uses macOS (~10x cost) or Windows (~2x cost) image without commands that need it. Move to ubuntu-latest.",
  category: 'cost',
  check(parsed) {
    const out = [];
    const all = jobs(parsed);
    for (const j of all) {
      const img = vmImageOf(j.pool);
      if (!img) continue;
      const key = String(img).toLowerCase();
      const meta = COSTS[key];
      if (!meta) continue;
      const allScript = j.steps.map(scriptOf).join('\n');
      if (HEAVY.test(allScript)) continue;
      const path = j.jobPath.length ? [...j.jobPath, 'pool', 'vmImage'] : ['pool', 'vmImage'];
      out.push(makeFinding(
        module.exports,
        parsed,
        `pool.vmImage: ${meta.name} costs ~${meta.mult}x ubuntu minutes; no Apple/Windows-only commands detected. Use ${meta.alt}.`,
        path,
      ));
    }
    return out;
  },
};
